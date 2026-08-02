import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

function run(script, args = []) {
  execFileSync(process.execPath, [resolve(root, 'scripts', script), ...args], {
    cwd: root,
    stdio: 'inherit'
  });
}

try {
  if (checkOnly) {
    run('generate-title-map.mjs', ['--check']);
    run('generate-admin-config.mjs', ['--check']);
    run('backup-articles.mjs', ['--verify', '--verify-source']);
    console.log('current site baseline check passed');
  } else {
    run('generate-title-map.mjs');
    run('generate-admin-config.mjs');
    run('backup-articles.mjs');
    run('baseline.mjs', ['--check']);
    console.log('current site baseline refreshed');
  }
} catch (error) {
  process.exit(error.status || 1);
}
