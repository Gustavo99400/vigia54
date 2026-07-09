/**
 * flatten-rsc.mjs
 * Copies nested RSC payload files (__next.* / __PAGE__.txt)
 * to flat dot-separated siblings for `npx serve` compatibility.
 */
import { readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, '..', 'out');
let count = 0;

function flatten(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      flatten(fullPath);
      if (entry.startsWith('__next.')) {
        for (const child of readdirSync(fullPath)) {
          const childPath = join(fullPath, child);
          if (statSync(childPath).isFile()) {
            const dest = join(dir, `${entry}.${child}`);
            copyFileSync(childPath, dest);
            count++;
          }
        }
      }
    }
  }
}

console.log('Flattening RSC payload files...');
flatten(OUT_DIR);
console.log(`Done — ${count} file(s) flattened.`);
