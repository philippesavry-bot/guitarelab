// Génère public/guitar-lab.html à partir de :
//   - scripts/guitar-lab.source.jsx  (le code de l'application, à faire évoluer)
//   - scripts/guitar-lab-shell.html  (la coquille HTML : CDN, stockage, sync iCloud)
// Usage : bun run scripts/build-guitar-lab.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const shell = await readFile(resolve(root, "scripts/guitar-lab-shell.html"), "utf8");
let app = await readFile(resolve(root, "scripts/guitar-lab.source.jsx"), "utf8");

// On retire les imports (React et lucide sont fournis par la coquille via CDN)
app = app
  .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
  .replace(/export\s+default\s+function/, "function")
  .trim();

const out = shell.replace("/* __APP_CODE__ */", app);
const target = resolve(root, "public/guitar-lab.html");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, out, "utf8");
console.log(`public/guitar-lab.html écrit (${(out.length / 1024).toFixed(1)} Ko)`);
