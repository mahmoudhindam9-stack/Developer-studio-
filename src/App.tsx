import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Bot, Braces, ChevronDown, ChevronRight, CircleAlert, Code2, ExternalLink, File, FileCode2, FileJson, Folder, FolderOpen, GitBranch, Hammer, Play, Save, Send, ShieldCheck, Square, TerminalSquare, TestTube2, X } from 'lucide-react';

type Item = StudioTreeItem;
type Message = { id: string; role: 'user' | 'assistant' | 'activity'; text: string };
const languages: Record<string,string> = {ts:'typescript',tsx:'typescript',js:'javascript',jsx:'javascript',mjs:'javascript',json:'json',css:'css',html:'html',md:'markdown',sql:'sql',py:'python',yml:'yaml',yaml:'yaml'};
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function FileIcon({name}:{name:string}) {
  const ext=name.split('.').pop()?.toLowerCase();
  if(ext==='json')return <FileJson size={14}/>;
  if(['ts','tsx','js','jsx','mjs'].includes(ext||''))return <FileCode2 size={14}/>;
  if(['css','html','sql'].includes(ext||''))return <Braces size={14}/>;
  return <File size={14}/>;
}
function FileTree({item,depth=0,selected,onOpen}:{item:Item;depth?:number;selected:string;onOpen:(item:Item)=>void}) {
  const [expanded,setExpanded]=useState(depth===0);
  return <>
    <button className={'tree-row '+(selected===item.path?'selected':'')} style={{paddingLeft:10+depth*14}} onClick={()=>item.type==='directory'?setExpanded(!expanded):onOpen(item)}>
      {item.type==='directory'?(expanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<i/>}
      {item.type==='directory'?<Folder size={14} className="folder-icon"/>:<FileIcon name={item.name}/>}
      <span>{item.name}</span>
    </button>
    {item.type==='directory'&&expanded&&item.children?.map(child=><FileTree key={child.path} item={child} depth={depth+1} selected={selected} onOpen={onOpen}/>)}
  </>;
}
export default function App() {
  const [project,setProject]=useState<{root:string;name:string}|null>(null);
  const [recent,setRecent]=useState<string[]>([]);
  const [tree,setTree]=useState<Item[]>([]);
  const [file,setFile]=useState('');
  const [code,setCode]=useState('');
  const [saved,setSaved]=useState('');
  const [scripts,setScripts]=useState<Record<string,string>>({});
  const [view,setView]=useState<'code'|'preview'|'git'>('code');
  const [preview,setPreview]=useState('');
  const [output,setOutput]=useState('Ready. Open a local project to begin.');
  const [running,setRunning]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [prompt,setPrompt]=useState('');
  const [agent,setAgent]=useState(false);
  const [permission,setPermission]=useState<any>(null);
  const [writeApproval,setWriteApproval]=useState<any>(null);
  const [gitStatus,setGitStatus]=useState('');
  const [gitDiff,setGitDiff]=useState('');
  const [commitMessage,setCommitMessage]=useState('');
  const [goosePath,setGoosePath]=useState('');
  const [showAgent,setShowAgent]=useState(true);
  const [showOutput,setShowOutput]=useState(true);
  const dirty=code!==saved;
  const language=useMemo(()=>languages[file.split('.').pop()?.toLowerCase()||'']||'plaintext',[file]);

  const refreshTree=async()=>setTree(await window.developerStudio.getProjectTree());
  const openProject=async(result:any)=>{
    if(!result)return;
    if(dirty&&!window.confirm('Discard unsaved changes before switching project?'))return;
    setProject({root:result.root,name:result.name});
    setTree(result.tree||[]);
    setRecent(result.recentProjects||[]);
    setScripts(await window.developerStudio.getScripts());
    setFile('');setCode('');setSaved('');setPreview('');setView('code');
    setOutput('Opened '+result.root);
    setMessages([{id:makeId(),role:'assistant',text:'Project opened. Ask Goose to inspect, explain, modify, or test this codebase.'}]);
    try{setGitStatus(await window.developerStudio.gitStatus());}catch{setGitStatus('Git is not initialized in this folder.');}
  };

  useEffect(()=>{
    void window.developerStudio.getProjectInfo().then(info=>{setRecent(info.recentProjects||[]);setGoosePath(info.goosePath||'');});
    const unsubscribe=window.developerStudio.onEvent(event=>{
      if(event.type==='task:started'){setRunning(event.kind);setOutput('$ '+event.command+'\n');}
      if(event.type==='task:output')setOutput(value=>value+event.text);
      if(event.type==='task:finished'){setRunning('');setOutput(value=>value+'\n[exit '+event.code+']');}
      if(event.type==='preview:url'){setPreview(event.url);setView('preview');}
      if(event.type==='file:saved')void refreshTree();
      if(event.type==='agent:connected'||event.type==='agent:ready')setAgent(true);
      if(event.type==='agent:disconnected')setAgent(false);
      if(event.type==='agent:error'){setAgent(false);setMessages(value=>[...value,{id:makeId(),role:'activity',text:event.message}]);}
      if(event.type==='agent:permission')setPermission(event);
      if(event.type==='agent:writeApproval')setWriteApproval(event);
      if(event.type==='agent:turnFinished')setMessages(value=>[...value,{id:makeId(),role:'activity',text:'Agent finished · '+event.stopReason}]);
      if(event.type==='agent:update'){
        const update=event.notification?.update;
        if(update?.sessionUpdate==='agent_message_chunk'&&update.content?.type==='text')
          setMessages(value=>[...value,{id:makeId(),role:'assistant',text:update.content.text}]);
        if(update?.sessionUpdate==='tool_call'||update?.sessionUpdate==='tool_call_update')
          setMessages(value=>[...value,{id:makeId(),role:'activity',text:(update.title||update.toolCallId)+' · '+update.status}]);
      }
    });
    return unsubscribe;
  },[]);

  const openFile=async(item:Item)=>{
    if(dirty&&!window.confirm('Discard unsaved changes?'))return;
    try{const result=await window.developerStudio.readFile(item.path);setFile(result.path);setCode(result.content);setSaved(result.content);setView('code');}
    catch(error:any){setOutput(error.message||String(error));}
  };
  const save=async()=>{
    if(!file)return;
    try{await window.developerStudio.writeFile(file,code);setSaved(code);setOutput('Saved '+file);}
    catch(error:any){setOutput('Save failed: '+(error.message||String(error)));}
  };
  const run=async(kind:string)=>{
    try{await window.developerStudio.runTask(kind);setView('code');setShowOutput(true);}
    catch(error:any){setOutput(error.message||String(error));}
  };
  const startPreview=async()=>{
    try{const result=await window.developerStudio.startPreview();setPreview(result.url);setView('preview');setShowOutput(true);}
    catch(error:any){setOutput(error.message||String(error));}
  };
  const connectAgent=async()=>{
    try{setOutput('Starting Goose agent…');await window.developerStudio.connectAgent();}
    catch(error:any){setAgent(false);setMessages(value=>[...value,{id:makeId(),role:'activity',text:error.message||String(error)}]);}
  };
  const sendPrompt=async()=>{
    const value=prompt.trim();if(!value)return;
    setPrompt('');setMessages(list=>[...list,{id:makeId(),role:'user',text:value}]);
    try{await window.developerStudio.sendAgentPrompt(value);}
    catch(error:any){setMessages(list=>[...list,{id:makeId(),role:'activity',text:error.message||String(error)}]);}
  };
  const refreshGit=async()=>{
    try{setGitStatus(await window.developerStudio.gitStatus());setGitDiff(await window.developerStudio.gitDiff());setView('git');}
    catch(error:any){setGitStatus(error.message||String(error));setGitDiff('');setView('git');}
  };
  const makeCommit=async()=>{
    try{setOutput(await window.developerStudio.gitCommit(commitMessage));setCommitMessage('');await refreshGit();}
    catch(error:any){setGitStatus(error.message||String(error));}
  };

  return <div className="shell">
    <header className="top">
      <div className="logo"><Code2 size={18}/></div>
      <b>DEVELOPER <em>STUDIO</em></b><span className="version">DESKTOP 0.1</span>
      <button className="project" onClick={async()=>openProject(await window.developerStudio.chooseProject())}><FolderOpen size={14}/>{project?.name||'Open project'}<ChevronDown size={13}/></button>
      <span className="path">{project?.root||''}</span>
      <span className={'status '+(agent?'online':'')}>{agent?'GOOSE CONNECTED':'AGENT OFFLINE'}</span>
      <button className="ghost" onClick={()=>setShowAgent(value=>!value)} title="Toggle AI panel"><Bot size={16}/></button>
    </header>
    <nav className="bar">
      <div>
        <button className="primary" disabled={!file||!dirty} onClick={()=>void save()}><Save size={14}/>Save <kbd>Ctrl S</kbd></button>
        <button disabled={!scripts.dev||!!running} onClick={()=>void startPreview()}><Play size={14}/>Run</button>
        <button disabled={!scripts.build||!!running} onClick={()=>void run('build')}><Hammer size={14}/>Build</button>
        <button disabled={!scripts.test||!!running} onClick={()=>void run('test')}><TestTube2 size={14}/>Test</button>
        <button disabled={!running} onClick={()=>void window.developerStudio.stopTask()}><Square size={13}/>Stop</button>
      </div>
      <div>
        <button className={view==='code'?'active':''} onClick={()=>setView('code')}><Code2 size={14}/>Code</button>
        <button className={view==='preview'?'active':''} onClick={()=>setView('preview')}><ExternalLink size={14}/>Preview</button>
        <button className={view==='git'?'active':''} onClick={()=>void refreshGit()}><GitBranch size={14}/>Git</button>
      </div>
    </nav>
    <div className="body">
      <aside className="explorer">
        <div className="section-title">PROJECT EXPLORER <button className="ghost" onClick={()=>void refreshTree()}>↻</button></div>
        {project?<><div className="root-label"><FolderOpen size={13}/>{project.name.toUpperCase()}</div><div className="file-tree">{tree.map(item=><FileTree key={item.path} item={item} selected={file} onOpen={openFile}/>)}</div></>
          :<div className="empty"><FolderOpen size={26}/><b>No project selected</b><button onClick={async()=>openProject(await window.developerStudio.chooseProject())}>Open local folder</button>{recent.map(path=><small key={path} onClick={async()=>openProject(await window.developerStudio.openRecentProject(path))}>{path.split(/[\\/]/).pop()}</small>)}</div>}
        <div className="local-note"><ShieldCheck size={12}/> Local files · No cloud sync</div>
      </aside>
      <main className="main">
        {file&&view==='code'&&<div className="file-tab"><FileIcon name={file}/>{file}{dirty&&<i/>}<span/><button className="ghost" onClick={()=>{setFile('');setCode('');setSaved('');}}><X size={13}/></button></div>}
        {view==='code'?(file?<Editor height="100%" theme="vs-dark" language={language} value={code} onChange={value=>setCode(value||'')} onMount={editor=>editor.addCommand(2048|49,()=>void save())} options={{fontSize:13,minimap:{enabled:true},automaticLayout:true,scrollBeyondLastLine:false,wordWrap:'off',tabSize:2,padding:{top:12},fontFamily:"'Cascadia Code',Consolas,monospace"}}/>
          :<div className="welcome"><div><Code2 size={30}/></div><small>LOCAL-FIRST DEVELOPMENT WORKSPACE</small><h1>Build. Refine. <em>Ship.</em></h1><p>Open any software project and edit, preview, rebuild, and collaborate with an AI coding agent locally.</p><button className="primary" onClick={async()=>openProject(await window.developerStudio.chooseProject())}><FolderOpen size={15}/>Open project folder</button></div>)
          :view==='preview'?<div className="preview"><div className="url">{preview||'Start the development script to preview this app.'}<button className="ghost" disabled={!preview} onClick={()=>void window.developerStudio.openPreviewExternal()}><ExternalLink size={14}/></button></div>{preview?<iframe title="Local project preview" src={preview} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/>:<button onClick={()=>void startPreview()}>Start preview</button>}</div>
          :<div className="git"><h3>Source control</h3><pre>{gitStatus||'Loading Git status'}</pre><h4>Diff</h4><pre>{gitDiff||'No diff loaded.'}</pre><div><input value={commitMessage} onChange={event=>setCommitMessage(event.target.value)} placeholder="Commit message"/><button className="primary" disabled={!commitMessage.trim()} onClick={()=>void makeCommit()}>Commit locally</button></div><small>Commits stay local. No automatic push or deployment.</small></div>}
        <footer><span>{project?.name||'No workspace'}</span><span>{file||'Ready'}</span><span>{dirty?'Unsaved':'Saved'}</span><span>{language.toUpperCase()}</span><span>Workspace isolated</span></footer>
      </main>
      {showAgent&&<aside className="assistant">
        <div className="section-title"><Bot size={16}/>AI CODING AGENT<button className="ghost" onClick={()=>void window.developerStudio.disconnectAgent()}><X size={13}/></button></div>
        <div className="goose"><b>Goose Agent</b><span>{agent?'Connected to the selected project':'Connect a local Goose installation'}</span><button onClick={()=>void connectAgent()} disabled={!project}>{agent?'Reconnect':'Connect Goose'}</button><button className="path-btn" onClick={async()=>{const result=await window.developerStudio.chooseGoosePath();if(result)setGoosePath(result.goosePath);}}>Choose Goose executable</button>{goosePath&&<small>{goosePath}</small>}</div>
        <p className="safety"><ShieldCheck size={13}/>Workspace-only file access. Agent writes and tool permissions require approval.</p>
        <div className="messages">{messages.map(message=><article key={message.id} className={message.role}><small>{message.role==='user'?'YOU':message.role==='assistant'?'GOOSE':'ACTIVITY'}</small><p>{message.text}</p></article>)}{messages.length===0&&<p className="hint">Ask Goose to inspect your project, fix bugs, implement features, and run tests.</p>}</div>
        {permission&&<div className="approval"><b><CircleAlert size={14}/> Permission requested</b><p>{permission.title}</p>{permission.options?.map((option:any)=><button key={option.optionId} onClick={async()=>{await window.developerStudio.decideAgentPermission(permission.id,option.optionId);setPermission(null);}}>{option.name||option.optionId}</button>)}<button onClick={async()=>{await window.developerStudio.decideAgentPermission(permission.id,'cancel');setPermission(null);}}>Deny</button></div>}
        {writeApproval&&<div className="approval"><b>Agent wants to write</b><p>{writeApproval.path}</p><pre>{String(writeApproval.content||'').slice(0,500)}</pre><button onClick={async()=>{await window.developerStudio.decideAgentWrite(writeApproval.id,true);setWriteApproval(null);void refreshTree();}}>Allow write</button><button onClick={async()=>{await window.developerStudio.decideAgentWrite(writeApproval.id,false);setWriteApproval(null);}}>Deny</button></div>}
        <form className="prompt" onSubmit={event=>{event.preventDefault();void sendPrompt();}}><textarea value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder={agent?'Describe the task…':'Connect Goose to start…'} rows={3}/><button type="submit" disabled={!agent||!prompt.trim()}><Send size={14}/></button></form>
      </aside>}
    </div>
    {showOutput&&<section className="terminal"><header><span><TerminalSquare size={13}/> OUTPUT {running&&' · '+running.toUpperCase()}</span><button className="ghost" onClick={()=>setShowOutput(false)}><X size={13}/></button></header><pre>{output}</pre></section>}
    {!showOutput&&<button className="show-terminal" onClick={()=>setShowOutput(true)}>Show output panel</button>}
  </div>;
}
