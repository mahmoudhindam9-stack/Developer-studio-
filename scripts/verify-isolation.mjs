import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  /@supabase\/supabase-js/i,
  /@\/integrations\/supabase/i,
  /myqtvbfibvgxkqwxvuru/i,
  /jupa-sep(?:\.git)?/i,
  /SUPABASE_(?:URL|SERVICE_ROLE_KEY|ANON_KEY|DB_PASSWORD)/i,
  /VITE_SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY)/i
];
const checked = [];
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git", ".vercel"].includes(entry.name)) continue;
      walk(full);
    } else if (/\.(?:ts|tsx|js|mjs|json|cjs)$/.test(entry.name)) {
      checked.push(full);
    }
  }
}
for (const dir of ["src", "api", "electron", "scripts"]) walk(path.join(root, dir));
checked.push(path.join(root, "package.json"));

for (const file of checked) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      errors.push(path.relative(root, file) + " contains forbidden isolation marker: " + String(pattern));
    }
  }
}
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dependencyNames = Object.keys({ ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) });
if (dependencyNames.some(name => name.startsWith("@supabase/"))) {
  errors.push("package.json must not depend on @supabase packages.");
}
const servicePath = path.join(root, "src/features/developer-studio/services/studioService.ts");
const service = fs.readFileSync(servicePath, "utf8");
if (!service.includes('"developer-studio-independent-pro"') ||
    !service.includes('"developer-studio-independent-pro:v1"')) {
  errors.push("Standalone storage namespace is missing or has changed.");
}
if (errors.length) {
  console.error("Isolation verification failed:");
  errors.forEach(error => console.error(" - " + error));
  process.exit(1);
}
console.log("Isolation verified: " + checked.length + " source/config files scanned; no Juba database/auth integration or shared keys.");
