import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyCdcProvenance } from './cdc-provenance.mjs';

test('CDC provenance rejects a missing checkout', () => {
  assert.throws(
    () => verifyCdcProvenance(join(tmpdir(), 'codesome-cdc-does-not-exist')),
    /CDC source checkout not found/
  );
});

test('CDC provenance rejects a fixed-tag commit mismatch', () => {
  const repository = mkdtempSync(join(tmpdir(), 'codesome-cdc-mismatch-'));
  try {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repository });
    execFileSync('git', ['config', 'user.name', 'provenance-test'], { cwd: repository });
    execFileSync('git', ['config', 'user.email', 'provenance-test@example.invalid'], { cwd: repository });
    writeFileSync(join(repository, 'README.md'), 'not the CDC snapshot\n');
    execFileSync('git', ['add', '.'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'wrong snapshot'], { cwd: repository });
    execFileSync('git', ['tag', 'cdc-snapshot-2026-07-14'], { cwd: repository });

    assert.throws(
      () => verifyCdcProvenance(repository),
      /CDC tag mismatch/
    );
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});
