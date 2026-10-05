import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await build({
  absWorkingDir: root,
  entryPoints: ['desktop/main.mjs'],
  outfile: 'desktop/dist/main.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron', 'ws'],
  logLevel: 'info',
});
