// Génère public/guitar-lab.html à partir de scripts/guitar-lab-app.source.html.
//
// La source contient le code de l'application en JSX (<script type="text/babel">).
// Ce script le convertit en JavaScript classique AU MOMENT DU BUILD et retire le
// compilateur Babel du navigateur : le démarrage sur iPad passe de ~10-20 s d'écran
// figé à un affichage quasi immédiat.
//
// Usage : bun run scripts/build-guitar-lab.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as Babel from "@babel/standalone";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "scripts/guitar-lab-app.source.html");
let html = await readFile(sourcePath, "utf8");

// 1. Extraction du bloc JSX
const scriptRe = /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/;
const match = html.match(scriptRe);
if (!match) throw new Error('Bloc <script type="text/babel"> introuvable dans la source.');

// 2. Transpilation JSX -> JS (aucun polyfill : Safari iPad récent gère la syntaxe moderne)
const { code } = Babel.transform(match[1], {
  presets: [["react", { runtime: "classic" }]],
  compact: false,
  sourceType: "script",
});

// 3. Remplacement par un script classique
html = html.replace(scriptRe, `<script>\n${code}\n</script>`);

// 4. Suppression du CDN Babel (inutile désormais) et du filtre d'avertissement associé
html = html.replace(
  /^\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^>]*><\/script>\n?/m,
  "",
);

const target = resolve(root, "public/guitar-lab.html");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, html, "utf8");
console.log(
  `public/guitar-lab.html écrit (${(html.length / 1024).toFixed(1)} Ko, JSX précompilé)`,
);
