import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import JSZip from 'jszip';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)), isDev=!app.isPackaged;
const ignored=new Set(['.git','node_modules','dist','build','.next','.turbo','.cache','coverage','.venv','venv','.developer-studio','release']);
const maxText=2*1024*1024, maxTree=5000;
let win=null, root=null, task=null, preview=null, agent=null;
let prefs={goosePath:'',recentProjects:[]};
const settingsFile=()=>path.join(app.getPath('userData'),'settings.json');
const emit=(type,data={})=>{if(win&&!win.isDestroyed())win.webContents.send('studio:event',{type,...data});};
const inside=(base,target)=>{const r=path.relative(base,target);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
async function savePrefs(){await fs.mkdir(path.dirname(settingsFile()),{recursive:true});await fs.writeFile(settingsFile(),JSON.stringify(prefs,null,2));}
async function setRoot(folder){const s=await fs.stat(folder);if(!s.isDirectory())throw Error('Select a project folder.');const next=await fs.realpath(folder);if(task)throw Error('Stop the running project task before switching workspaces.');if(agent){agent.stop();agent=null;}root=next;preview=null;prefs.recentProjects=[root,...prefs.recentProjects.filter(x=>x!==root)].slice(0,12);await savePrefs();return root;}
async function resolveFile(p,exists=false){if(!root||typeof p!=='string'||!p.trim())throw Error('Open a project and select a file.');const f=path.resolve(path.isAbsolute(p)?p:path.join(root,p));if(!inside(root,f))throw Error('Path is outside the selected project.');if(exists){const [a,b]=await Promise.all([fs.realpath(root),fs.realpath(f)]);if(!inside(a,b))throw Error('Symlink outside project is blocked.');}return f;}
async function tree(){let count=0;async function walk(dir,depth){if(depth>8||count>=maxTree)return[];let entries=[];try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{return[];}entries.sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name));const out=[];for(const e of entries){if(ignored.has(e.name)||e.isSymbolicLink()||e.name==='.DS_Store')continue;if(++count>maxTree)break;const abs=path.join(dir,e.name),rel=path.relative(root,abs).split(path.sep).join('/');if(e.isDirectory())out.push({name:e.name,path:rel,type:'directory',children:await walk(abs,depth+1)});else if(e.isFile()){const st=await fs.stat(abs).catch(()=>null);out.push({name:e.name,path:rel,type:'file',size:st?.size||0});}}return out;}return root?walk(root,0):[];}
async function readText(p){const f=await resolveFile(p,true),st=await fs.stat(f);if(!st.isFile()||st.size>maxText)throw Error('Only text files up to 2 MB can be opened.');const b=await fs.readFile(f);if(b.includes(0))throw Error('Binary files cannot be opened as text.');return{path:path.relative(root,f).split(path.sep).join('/'),content:b.toString('utf8'),size:st.size};}
async function writeText(p,content){if(typeof content!=='string'||Buffer.byteLength(content)>maxText)throw Error('Text file limit is 2 MB.');const f=await resolveFile(p);const realRoot=await fs.realpath(root);let parent=path.dirname(f);while(!existsSync(parent)&&inside(root,parent)){const up=path.dirname(parent);if(up===parent)break;parent=up;}if(!inside(realRoot,await fs.realpath(parent)))throw Error('Parent folder escapes project.');await fs.mkdir(path.dirname(f),{recursive:true});if(!inside(realRoot,await fs.realpath(path.dirname(f))))throw Error('Parent folder escapes project.');try{const st=await fs.lstat(f);if(st.isSymbolicLink()||!st.isFile())throw Error('Refusing to replace a symlink or non-file.');const old=await fs.readFile(f);if(old.length<=maxText){const dir=path.join(root,'.developer-studio','backups');const base=path.join(root,'.developer-studio');await fs.mkdir(base,{recursive:true});const baseStat=await fs.lstat(base);if(baseStat.isSymbolicLink()||!baseStat.isDirectory())throw Error('Unsafe backup directory.');await fs.mkdir(dir,{recursive:true});const dirStat=await fs.lstat(dir);if(dirStat.isSymbolicLink()||!dirStat.isDirectory()||!inside(realRoot,await fs.realpath(dir)))throw Error('Backup directory must remain inside the project.');await fs.writeFile(path.join(dir,path.basename(f)+'.'+Date.now()+'.bak'),old,{flag:'wx'});}}catch(e){if(e.code!=='ENOENT')throw e;}const tmp=f+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,content,{encoding:'utf8',flag:'wx'});await fs.rename(tmp,f);emit('file:saved',{path:p});return{success:true,path:p};}
function spawnTask(cmd,args){return spawn(cmd,args,{cwd:root,env:{...process.env},stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});}
async function scripts(){try{return JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).scripts||{};}catch{return{};}}
function packageManager(){if(!root)return'npm';if(existsSync(path.join(root,'pnpm-lock.yaml')))return'pnpm';if(existsSync(path.join(root,'yarn.lock')))return'yarn';return'npm';}
function startManagedTask(kind,command,args){
 if(task)throw Error('Stop the current task first.');
 const isWin=process.platform==='win32';
 const executable=isWin?(process.env.ComSpec||'cmd.exe'):command;
 const finalArgs=isWin?['/d','/s','/c',command+'.cmd '+args.join(' ')]:args;
 const child=spawnTask(executable,finalArgs),id=randomUUID();
 task={id,child,kind};
 emit('task:started',{id,kind,command:command+' '+args.join(' ')});
 const chunk=(stream,d)=>{
  const text=d.toString();
  emit('task:output',{id,stream,text});
  if(kind==='dev'){
   const m=text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+[^\s]*/i);
   if(m){preview=m[0].replace(/[),]+$/,'');emit('preview:url',{url:preview});}
  }
 };
 child.stdout.on('data',d=>chunk('stdout',d));
 child.stderr.on('data',d=>chunk('stderr',d));
 child.on('error',e=>{emit('task:finished',{id,kind,code:-1,error:e.message});if(task?.id===id)task=null;});
 child.on('close',(code,signal)=>{emit('task:finished',{id,kind,code:code??-1,signal});if(task?.id===id)task=null;});
 return{id,kind};
}
async function runTask(kind){
 if(!root)throw Error('Open a project first.');
 if(!(['dev','start','build','test','typecheck','lint','preview','web'].includes(kind)))throw Error('Task is not allowed.');
 if(!(await scripts())[kind])throw Error('This project does not define the '+kind+' script.');
 const manager=packageManager();
 return startManagedTask(kind,manager,['run',kind]);
}
async function installDependencies(){
 if(!root)throw Error('Open a project first.');
 if(!existsSync(path.join(root,'package.json')))throw Error('No package.json was found in the selected project.');
 const manager=packageManager();
 let args;
 if(manager==='npm')args=existsSync(path.join(root,'package-lock.json'))||existsSync(path.join(root,'npm-shrinkwrap.json'))?['ci','--no-audit','--no-fund']:['install','--no-audit','--no-fund'];
 else if(manager==='pnpm')args=['install','--frozen-lockfile'];
 else args=['install','--frozen-lockfile'];
 return startManagedTask('install',manager,args);
}
function stopTask(){if(!task)return{stopped:false};const t=task;if(process.platform==='win32'&&t.child.pid){const k=spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','taskkill /pid '+t.child.pid+' /t /f'],{stdio:'ignore',shell:false,windowsHide:true});k.on('error',()=>t.child.kill());}else t.child.kill('SIGTERM');return{stopped:true};}
function git(args){return new Promise((resolve,reject)=>{if(!root)return reject(Error('Open a project first.'));const c=spawnTask('git',args);let out='',err='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('close',code=>code===0?resolve(out):reject(Error(err||'git exit '+code)));});}
class Queue{constructor(){this.items=[];this.waiters=[];}push(x){const w=this.waiters.shift();w?w(x):this.items.push(x);}take(){return this.items.length?Promise.resolve(this.items.shift()):new Promise(r=>this.waiters.push(r));}close(){this.waiters.splice(0).forEach(r=>r(null));}}
class Goose{
constructor(){this.child=null;this.session=null;this.running=false;this.q=new Queue();this.perms=new Map();this.writes=new Map();}
async connect(){if(!root)throw Error('Open a project first.');const acp=await import('@agentclientprotocol/sdk');const bin=prefs.goosePath||(process.platform==='win32'?'goose.exe':'goose');this.child=spawn(bin,['acp'],{cwd:root,stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true});this.running=true;const child=this.child;child.stderr.on('data',d=>emit('agent:log',{text:d.toString()}));child.on('error',e=>this.fail(e));child.on('close',(c,s)=>{if(this.running)this.fail(Error('Goose exited: '+(c??s)));});const stream=acp.ndJsonStream(Writable.toWeb(child.stdin),Readable.toWeb(child.stdout));const client=acp.client({name:'developer-studio',version:'0.1.0'}).onRequest(acp.methods.client.session.requestPermission,ctx=>this.permission(ctx.params)).onRequest(acp.methods.client.fs.readTextFile,async ctx=>{const p=path.resolve(root,ctx.params.path);if(!inside(root,p))throw Error('Agent read outside workspace blocked.');const x=await readText(p);return{content:x.content};}).onRequest(acp.methods.client.fs.writeTextFile,async ctx=>{const id=randomUUID();emit('agent:writeApproval',{id,path:ctx.params.path,content:ctx.params.content});const ok=await new Promise(r=>this.writes.set(id,r));if(!ok)throw Error('User denied file write.');await writeText(path.relative(root,ctx.params.path),ctx.params.content);return{};});this.connection=client.connectWith(stream,async ctx=>{const init=await ctx.request(acp.methods.agent.initialize,{protocolVersion:acp.PROTOCOL_VERSION,clientCapabilities:{fs:{readTextFile:true,writeTextFile:true}}});emit('agent:connected',{protocolVersion:init.protocolVersion});return ctx.buildSession(root).withSession(async session=>{this.session=session;emit('agent:ready',{sessionId:session.sessionId});while(this.running){const job=await this.q.take();if(!job||!this.running)break;session.prompt(job.text);while(this.running){const u=await session.nextUpdate();if(u.kind==='stop'){emit('agent:turnFinished',{stopReason:u.response?.stopReason||'end_turn'});break;}emit('agent:update',{notification:u.notification});}}});}).catch(e=>this.fail(e));return{connected:true};}
async permission(p){const id=randomUUID();emit('agent:permission',{id,title:p.toolCall?.title||'Agent requests permission',options:p.options||[]});const pick=await new Promise(r=>this.perms.set(id,r));const opt=(p.options||[]).find(x=>x.optionId===pick);return opt?{outcome:{outcome:'selected',optionId:opt.optionId}}:{outcome:{outcome:'cancelled'}};}
prompt(text){if(!this.session||!this.running)throw Error('Goose is not ready.');this.q.push({text});return{queued:true};}
decidePermission(id,value){const fn=this.perms.get(id);if(!fn)return false;this.perms.delete(id);fn(value);return true;}
decideWrite(id,value){const fn=this.writes.get(id);if(!fn)return false;this.writes.delete(id);fn(!!value);return true;}
fail(e){emit('agent:error',{message:e.message||String(e)});this.stop();}
stop(){this.running=false;this.session=null;this.q.close();this.perms.forEach(fn=>fn('cancel'));this.writes.forEach(fn=>fn(false));this.perms.clear();this.writes.clear();if(this.child&&!this.child.killed)this.child.kill('SIGTERM');this.child=null;emit('agent:disconnected');}
}
async function importProjectArchive(){
 const selected=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Project archive',extensions:['zip']}]});
 if(selected.canceled||!selected.filePaths[0])return null;
 const archivePath=selected.filePaths[0];
 const archiveStat=await fs.stat(archivePath);
 if(archiveStat.size>512*1024*1024)throw Error('ZIP archive is larger than the supported 512 MB import limit.');
 const destination=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],title:'Choose where to extract the project'});
 if(destination.canceled||!destination.filePaths[0])return null;
 const baseName=path.parse(archivePath).name.replace(/[^a-zA-Z0-9._ -]/g,'-').trim()||'Imported-Project';
 let target=path.join(destination.filePaths[0],baseName),suffix=2;
 while(existsSync(target)){target=path.join(destination.filePaths[0],baseName+'-'+suffix);suffix++;}
 await fs.mkdir(target,{recursive:true});
 const archive=await JSZip.loadAsync(await fs.readFile(archivePath),{checkCRC32:true});
 const entries=Object.values(archive.files);
 if(entries.length>20000)throw Error('Archive contains too many files (maximum 20,000).');
 let expandedBytes=0;
 const extracted=[];
 for(const entry of entries){
  const normalized=String(entry.unsafeOriginalName||entry.name||'').replace(/\\/g,'/');
  const parts=normalized.split('/').filter(Boolean);
  if(!parts.length||normalized.startsWith('/')||/^[a-zA-Z]:/.test(normalized)||parts.some(p=>p==='.'||p==='..'))throw Error('Unsafe path found in ZIP archive: '+entry.name);
  const mode=Number(entry.unixPermissions||0);
  if((mode&0o170000)===0o120000)throw Error('Symbolic links are not allowed in imported project archives.');
  const output=path.resolve(target,...parts);
  if(!inside(target,output))throw Error('Archive entry escaped the selected project directory.');
  if(entry.dir){await fs.mkdir(output,{recursive:true});continue;}
  const declared=Number(entry._data?.uncompressedSize||0);
  expandedBytes+=declared;
  if(declared>256*1024*1024||expandedBytes>1024*1024*1024)throw Error('Archive expands beyond the supported 1 GB project limit.');
  const data=await entry.async('nodebuffer');
  expandedBytes+=declared?0:data.length;
  if(expandedBytes>1024*1024*1024)throw Error('Archive expands beyond the supported 1 GB project limit.');
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,data,{flag:'wx'});
  extracted.push(parts.join('/'));
 }
 const topLevels=new Set(extracted.map(p=>p.split('/')[0]));
 const hasTopLevelFiles=extracted.some(p=>!p.includes('/'));
 let projectRoot=target;
 if(topLevels.size===1&&!hasTopLevelFiles){
  const candidate=path.join(target,[...topLevels][0]);
  try{if((await fs.stat(candidate)).isDirectory())projectRoot=candidate;}catch{}
 }
 await setRoot(projectRoot);
 return{root,name:path.basename(projectRoot),tree:await tree(),recentProjects:prefs.recentProjects};
}
async function exportProjectArchive(){
 if(!root)throw Error('Open a project first.');
 const result=await dialog.showSaveDialog(win,{defaultPath:path.join(os.homedir(),path.basename(root)+'.zip'),filters:[{name:'ZIP archive',extensions:['zip']}]});
 if(result.canceled||!result.filePath)return null;
 const zip=new JSZip();
 let count=0,total=0;
 async function addDirectory(dir){
  const entries=await fs.readdir(dir,{withFileTypes:true});
  entries.sort((a,b)=>a.name.localeCompare(b.name));
  for(const entry of entries){
   if(entry.name==='.DS_Store'||ignored.has(entry.name)||entry.isSymbolicLink())continue;
   if(entry.name==='.env'||(entry.name.startsWith('.env.')&&!['.env.example','.env.sample'].includes(entry.name)))continue;
   const absolute=path.join(dir,entry.name);
   const relative=path.relative(root,absolute).split(path.sep).join('/');
   if(entry.isDirectory()){await addDirectory(absolute);continue;}
   if(!entry.isFile())continue;
   const stat=await fs.stat(absolute);
   total+=stat.size;count++;
   if(count>20000||total>1024*1024*1024)throw Error('Project exceeds the local ZIP export limits (20,000 files / 1 GB).');
   zip.file(relative,await fs.readFile(absolute),{date:stat.mtime});
  }
 }
 await addDirectory(root);
 const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 await fs.writeFile(result.filePath,buffer);
 return{filePath:result.filePath,fileCount:count,bytes:buffer.length};
}
function runCli(command,args){
 return new Promise((resolve,reject)=>{
  const isWin=process.platform==='win32';
  const executable=isWin&&command==='gh'?'gh.exe':command;
  const child=spawn(executable,args,{cwd:root,env:{...process.env},stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
  let stdout='',stderr='';
  child.stdout.on('data',d=>stdout+=d.toString());
  child.stderr.on('data',d=>stderr+=d.toString());
  child.on('error',reject);
  child.on('close',code=>code===0?resolve({stdout,stderr}):reject(Error(stderr||stdout||command+' exited with code '+code)));
 });
}
async function gitResult(args){
 return new Promise((resolve,reject)=>{
  if(!root)return reject(Error('Open a project first.'));
  const child=spawnTask('git',args);let stdout='',stderr='';
  child.stdout.on('data',d=>stdout+=d.toString());
  child.stderr.on('data',d=>stderr+=d.toString());
  child.on('error',reject);
  child.on('close',code=>resolve({code:code??-1,stdout,stderr}));
 });
}
async function ensureGitRepo(branchName){
 if(!existsSync(path.join(root,'.git'))){
  const init=await gitResult(['init','-b',branchName]);
  if(init.code!==0)throw Error(init.stderr||'Git initialization failed.');
 }
}
async function stageAndCommit(message){
 const add=await gitResult(['add','--all','--','.',':(exclude,glob)**/.env',':(exclude,glob)**/.env.*',':(exclude,glob)**/node_modules/**',':(exclude,glob)**/.git/**',':(exclude,glob)**/.developer-studio/**']);
 if(add.code!==0)throw Error(add.stderr||'Git staging failed.');
 const diff=await gitResult(['diff','--cached','--quiet']);
 if(diff.code===1){
  const commit=await gitResult(['commit','-m',message]);
  if(commit.code!==0)throw Error(commit.stderr||'Git commit failed. Configure git user.name and user.email if missing.');
 }else if(diff.code!==0)throw Error(diff.stderr||'Could not inspect staged changes.');
}
function validateGithubRemote(value){
 const remote=String(value||'').trim();
 if(/^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(remote))return remote;
 let url;
 try{url=new URL(remote);}catch{throw Error('Enter a valid GitHub HTTPS or SSH repository URL.');}
 if(url.hostname!=='github.com'||!['https:','ssh:'].includes(url.protocol)||url.username||url.password)throw Error('Only clean github.com repository URLs are supported. Do not put access tokens in the URL.');
 if(!/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(url.pathname))throw Error('The GitHub URL must point to owner/repository.');
 return remote;
}
async function saveProjectToGithub(options={}){
 if(!root)throw Error('Open a project first.');
 if(task)throw Error('Stop the running project task before saving to GitHub.');
 const remoteInput=String(options.remoteUrl||'').trim();
 const requestedBranch=String(options.branch||'').trim();
 const message=String(options.message||'Update project from Developer Studio').trim().slice(0,160);
 if(!message)throw Error('Enter a commit message.');
 let remote=remoteInput?validateGithubRemote(remoteInput):'';
 const hasGit=existsSync(path.join(root,'.git'));
 if(!hasGit&&!remote)throw Error('This folder has no Git history. Enter the GitHub repository URL so Developer Studio can connect its history before pushing.');
 if(!hasGit&&remote){
  const temporaryClone=path.join(os.tmpdir(),'developer-studio-history-'+randomUUID());
  try{
   await runCli('git',['clone',remote,temporaryClone]);
   await fs.cp(path.join(temporaryClone,'.git'),path.join(root,'.git'),{recursive:true,errorOnExist:true});
  }finally{
   await fs.rm(temporaryClone,{recursive:true,force:true}).catch(()=>undefined);
  }
 }
 if(!existsSync(path.join(root,'.git')))await ensureGitRepo(requestedBranch||'main');
 const current=await gitResult(['remote','get-url','origin']);
 if(remote){
  if(current.code===0)await git(['remote','set-url','origin',remote]);
  else await git(['remote','add','origin',remote]);
 }else if(current.code!==0)throw Error('This project has no origin remote. Enter the existing GitHub repository URL.');
 const currentBranch=await gitResult(['branch','--show-current']);
 const branchName=requestedBranch||currentBranch.stdout.trim()||'main';
 if(!currentBranch.stdout.trim()||requestedBranch)await git(['branch','-M',branchName]);
 await stageAndCommit(message);
 const pushed=await gitResult(['push','-u','origin',branchName]);
 if(pushed.code!==0)throw Error(pushed.stderr||pushed.stdout||'GitHub push failed. Check your Git credentials, permissions, and whether the remote branch has unrelated changes.');
 const finalRemote=await git(['remote','get-url','origin']);
 return{success:true,remoteUrl:finalRemote,branch:branchName};
}
async function createProjectOnGithub(options={}){
 if(!root)throw Error('Open a project first.');
 const name=String(options.name||'').trim();
 if(!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/.test(name))throw Error('Use repository name or owner/repository.');
 const visibility=options.visibility==='public'?'--public':'--private';
 const message=String(options.message||'Initial project import').trim().slice(0,160)||'Initial project import';
 await ensureGitRepo('main');
 await git(['branch','-M','main']);
 await stageAndCommit(message);
 await runCli('gh',['auth','status']);
 const created=await runCli('gh',['repo','create',name,visibility,'--source','.','--remote','developer-studio-export','--push']);
 const remote=await git(['remote','get-url','developer-studio-export']);
 return{success:true,url:'https://github.com/'+name,remoteUrl:remote,output:created.stdout};
}
function createWindow(){win=new BrowserWindow({show:false,width:1600,height:980,minWidth:1120,minHeight:720,autoHideMenuBar:true,backgroundColor:'#0b1020',title:'Developer Studio',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});win.once('ready-to-show',()=>{if(!win||win.isDestroyed())return;win.maximize();win.show();});if(isDev)win.loadURL('http://127.0.0.1:5173');else win.loadFile(path.join(here,'..','dist','index.html'));win.on('closed',()=>win=null);}
app.whenReady().then(async()=>{try{prefs={...prefs,...JSON.parse(await fs.readFile(settingsFile(),'utf8'))};}catch{}createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on('window-all-closed',()=>{agent?.stop();stopTask();if(process.platform!=='darwin')app.quit();});
ipcMain.handle('project:choose',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});if(r.canceled||!r.filePaths[0])return null;await setRoot(r.filePaths[0]);return{root,name:path.basename(root),tree:await tree(),recentProjects:prefs.recentProjects};});
ipcMain.handle('project:importArchive',()=>importProjectArchive());
ipcMain.handle('project:exportArchive',()=>exportProjectArchive());
ipcMain.handle('project:installDependencies',()=>installDependencies());
ipcMain.handle('git:saveToGitHub',(_e,options)=>saveProjectToGithub(options||{}));
ipcMain.handle('git:createGitHubProject',(_e,options)=>createProjectOnGithub(options||{}));
ipcMain.handle('project:openRecent',async(_e,p)=>{await setRoot(p);return{root,name:path.basename(root),tree:await tree(),recentProjects:prefs.recentProjects};});
ipcMain.handle('project:tree',()=>tree());ipcMain.handle('project:readFile',(_e,p)=>readText(p));ipcMain.handle('project:writeFile',(_e,p,c)=>writeText(p,c));
ipcMain.handle('project:info',()=>({root,name:root?path.basename(root):null,platform:process.platform,home:os.homedir(),recentProjects:prefs.recentProjects,goosePath:prefs.goosePath}));
ipcMain.handle('settings:chooseGoose',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openFile']});if(r.canceled||!r.filePaths[0])return null;prefs.goosePath=r.filePaths[0];await savePrefs();return{goosePath:prefs.goosePath};});
ipcMain.handle('settings:setGoosePath',async(_e,p)=>{prefs.goosePath=String(p||'');await savePrefs();return{goosePath:prefs.goosePath};});
ipcMain.handle('tasks:scripts',()=>scripts());ipcMain.handle('tasks:run',(_e,k)=>runTask(String(k)));ipcMain.handle('tasks:stop',()=>stopTask());
ipcMain.handle('preview:start',async()=>{if(task)throw Error('Stop current task first.');const t=await runTask('dev');preview=preview||'http://127.0.0.1:5173';return{...t,url:preview};});ipcMain.handle('preview:openExternal',()=>preview?shell.openExternal(preview):null);
ipcMain.handle('git:status',()=>git(['status','--short','--branch']));ipcMain.handle('git:diff',()=>git(['diff','--no-ext-diff','--','.']));
ipcMain.handle('git:commit',async(_e,m)=>{const msg=String(m||'').trim().slice(0,180);if(!msg)throw Error('Enter a commit message.');await git(['add','--all']);return git(['commit','-m',msg]);});
ipcMain.handle('agent:connect',async()=>{agent?.stop();agent=new Goose();return agent.connect();});ipcMain.handle('agent:prompt',(_e,p)=>{if(!agent)throw Error('Connect Goose first.');return agent.prompt(String(p||'').trim());});
ipcMain.handle('agent:permissionDecision',(_e,id,opt)=>({accepted:agent?.decidePermission(id,opt)||false}));ipcMain.handle('agent:writeDecision',(_e,id,ok)=>({accepted:agent?.decideWrite(id,ok)||false}));
ipcMain.handle('agent:disconnect',()=>{agent?.stop();agent=null;return{disconnected:true};});
ipcMain.handle('app:openExternal',async(_e,url)=>{const u=new URL(String(url));if(!['http:','https:'].includes(u.protocol))throw Error('Only web links are supported.');await shell.openExternal(u.href);return{opened:true};});
ipcMain.handle('app:version',()=>app.getVersion());
