import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCdcProvenance } from './cdc-provenance.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceIndex = process.argv.indexOf('--source');
if (sourceIndex !== -1 && !process.argv[sourceIndex + 1]) {
  console.error('--source requires a repository path');
  process.exit(2);
}

const sourceRepo = resolve(
  sourceIndex === -1
    ? process.env.CDC_SOURCE ?? resolve(root, '..', '..', 'hicodesome-docs-source')
    : process.argv[sourceIndex + 1]
);

try {
  const provenance = verifyCdcProvenance(sourceRepo);
  console.log(
    `CDC provenance verified: ${provenance.tag}@${provenance.commit}; ` +
    `${provenance.articleCount} source articles, ${provenance.referencedImageCount} referenced images`
  );
} catch (error) {
  console.error(`CDC provenance failed: ${error.message}`);
  process.exit(1);
}
