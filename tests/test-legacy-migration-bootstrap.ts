import assert from 'node:assert/strict';
import {
  LEGACY_CORE_SIGNATURE,
  classifyMigrationState
} from '../packages/database/scripts/migrate-deploy.mjs';

function exactLegacySignature() {
  return {
    migrationTableExists: false,
    tables: [...LEGACY_CORE_SIGNATURE.tables],
    customTypes: LEGACY_CORE_SIGNATURE.enums.map((value) => value.split(':', 1)[0]),
    columns: [...LEGACY_CORE_SIGNATURE.columns],
    enums: [...LEGACY_CORE_SIGNATURE.enums],
    constraints: [...LEGACY_CORE_SIGNATURE.constraints],
    indexes: [...LEGACY_CORE_SIGNATURE.indexes]
  };
}

const clean = classifyMigrationState({
  migrationTableExists: false,
  tables: [],
  customTypes: [],
  columns: [],
  enums: [],
  constraints: [],
  indexes: []
});
assert.equal(clean.kind, 'DEPLOY', 'A clean database must keep the normal Prisma deploy path.');

const current = classifyMigrationState({
  ...exactLegacySignature(),
  migrationTableExists: true
});
assert.equal(current.kind, 'DEPLOY', 'An existing migration ledger must never be rebased automatically.');

const verifiedLegacy = classifyMigrationState(exactLegacySignature());
assert.equal(verifiedLegacy.kind, 'BASELINE_INIT', 'Only the exact initial core schema may baseline init.');

const drifted = classifyMigrationState({
  ...exactLegacySignature(),
  tables: [...LEGACY_CORE_SIGNATURE.tables, 'UnexpectedTable']
});
assert.equal(drifted.kind, 'REJECT', 'An unexpected table must prevent automatic migration resolution.');

const missingIndex = classifyMigrationState({
  ...exactLegacySignature(),
  indexes: LEGACY_CORE_SIGNATURE.indexes.slice(1)
});
assert.equal(missingIndex.kind, 'REJECT', 'A partial legacy schema must not be treated as the verified initial schema.');

console.log('Legacy migration bootstrap only baselines the exact verified init schema.');
