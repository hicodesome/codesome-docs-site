import { randomBytes, scryptSync } from 'node:crypto';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const token = input.trim();
if (!token) {
  console.error('Read the editor token from stdin.');
  process.exit(2);
}

const n = 32768;
const r = 8;
const p = 1;
const salt = randomBytes(16);
const hash = scryptSync(token, salt, 32, { N: n, r, p, maxmem: 128 * 1024 * 1024 });
process.stdout.write(`scrypt$${n}$${r}$${p}$${salt.toString('base64url')}$${hash.toString('base64url')}\n`);
