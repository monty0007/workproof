// ─── WorkProof Circuit Simulation Tests ──────────────────────────────────────
// Exercises all 4 ZK circuits in both Compact contracts via the Midnight SDK
// compact-runtime simulation layer (no proof server required).
//
// Run:  npm test           (from project root)
//       node contract/test/circuit.test.js
// ─────────────────────────────────────────────────────────────────────────────

import { createConstructorContext, createCircuitContext, sampleContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract as ClaimContract } from '../dist/claim_proof/contract/index.js';
import { Contract as DatasetContract } from '../dist/dataset_proof/contract/index.js';

const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  ${PASS}  ${label}`); passed++; }
  else { console.log(`  ${FAIL}  ${label}`); failed++; }
}

function assertThrows(fn, label) {
  try { fn(); console.log(`  ${FAIL}  ${label} (did not throw)`); failed++; }
  catch { console.log(`  ${PASS}  ${label}`); passed++; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initContract(ContractClass) {
  const contract = new ContractClass({});
  const coinPubKey = { bytes: new Uint8Array(32) };
  const addr = sampleContractAddress();
  const init = contract.initialState(createConstructorContext(addr, coinPubKey));
  return { contract, coinPubKey, addr, init };
}

function freshCtx({ addr, coinPubKey, init }) {
  return createCircuitContext(addr, coinPubKey, init.currentContractState, init.currentPrivateState);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM PROOF CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ claim_proof.compact ═══\x1b[0m\n');

{
  const env = initContract(ClaimContract);
  assert(env.contract !== null, 'ClaimContract constructs successfully');
  assert(env.init.currentContractState !== undefined, 'Initial state is created');
  assert(env.init.currentPrivateState !== undefined, 'Private state is created');
}

// ── claim_employment circuit ─────────────────────────────────────────────────
console.log('\n  \x1b[36m── claim_employment ──\x1b[0m');
{
  const env = initContract(ClaimContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.claim_employment(
    ctx, 'claim-001', 'userhash_abc', 'companyhash_xyz', 'claimhash_123', '2024-01-15T00:00:00Z', 365n
  );
  assert(result !== undefined, 'claim_employment executes without error');
  assert(result.proofData !== undefined, 'claim_employment produces proofData');
  assert(typeof result.proofData === 'object', 'proofData is an object');
  assert(result.result !== undefined, 'Circuit returns a result');
}

// ── claim_employment with different inputs ───────────────────────────────────
{
  const env = initContract(ClaimContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.claim_employment(
    ctx, 'claim-999', 'user_different', 'company_different', 'hash_different', '2026-04-27', 180n
  );
  assert(result.proofData !== undefined, 'claim_employment works with different inputs');
}

// -- claim_employment: MUST reject employment_days=0 (private witness constraint)
{
  const env = initContract(ClaimContract);
  assertThrows(() => {
    const ctx = freshCtx(env);
    env.contract.impureCircuits.claim_employment(
      ctx, 'claim-bad', 'uh', 'ch', 'clh', 't', 0n
    );
  }, 'claim_employment rejects employment_days=0 (private witness must be > 0)');
}

// ── verify_claim circuit ─────────────────────────────────────────────────────
console.log('\n  \x1b[36m── verify_claim ──\x1b[0m');
{
  const env = initContract(ClaimContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.verify_claim(
    ctx, 'claim-001', 'verifier_hash_abc', 'claimhash_123', 'email_domain', 'vproof_hash_xyz'
  );
  assert(result !== undefined, 'verify_claim executes without error');
  assert(result.proofData !== undefined, 'verify_claim produces proofData');
  assert(typeof result.proofData === 'object', 'proofData is an object');
}

// ── verify_claim with linkedin type ──────────────────────────────────────────
{
  const env = initContract(ClaimContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.verify_claim(
    ctx, 'claim-002', 'verifier2', 'claimhash2', 'linkedin', 'vproof2'
  );
  assert(result.proofData !== undefined, 'verify_claim works with linkedin verification type');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATASET PROOF CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ dataset_proof.compact ═══\x1b[0m\n');

{
  const env = initContract(DatasetContract);
  assert(env.contract !== null, 'DatasetContract constructs successfully');
  assert(env.init.currentContractState !== undefined, 'Initial state is created');
}

// ── commit_dataset circuit (valid inputs) ────────────────────────────────────
console.log('\n  \x1b[36m── commit_dataset ──\x1b[0m');
{
  const env = initContract(DatasetContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.commit_dataset(
    ctx, 'ds-001', 'empl_hash_acme', 'schema_hash_hr', '2024-01-01', 1200n, 500n, 1n
  );
  assert(result !== undefined, 'commit_dataset executes (count=1200 >= min=500, deidentified=1)');
  assert(result.proofData !== undefined, 'commit_dataset produces proofData');
}

// ── commit_dataset: exact minimum threshold ──────────────────────────────────
{
  const env = initContract(DatasetContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.commit_dataset(
    ctx, 'ds-002', 'empl2', 'schema2', '2024-06-01', 500n, 500n, 1n
  );
  assert(result.proofData !== undefined, 'commit_dataset passes at exact minimum (count=500, min=500)');
}

// ── commit_dataset: MUST reject deidentified=0 ──────────────────────────────
{
  const env = initContract(DatasetContract);
  assertThrows(() => {
    const ctx = freshCtx(env);
    env.contract.impureCircuits.commit_dataset(ctx, 'ds-bad', 'h', 's', 't', 1000n, 500n, 0n);
  }, 'commit_dataset rejects deidentified=0 (privacy violation)');
}

// ── commit_dataset: MUST reject record_count < min ───────────────────────────
{
  const env = initContract(DatasetContract);
  assertThrows(() => {
    const ctx = freshCtx(env);
    env.contract.impureCircuits.commit_dataset(ctx, 'ds-bad2', 'h', 's', 't', 100n, 500n, 1n);
  }, 'commit_dataset rejects record_count < min_record_count');
}

// ── commit_dataset: MUST reject record_count=0 ──────────────────────────────
{
  const env = initContract(DatasetContract);
  assertThrows(() => {
    const ctx = freshCtx(env);
    env.contract.impureCircuits.commit_dataset(ctx, 'ds-bad3', 'h', 's', 't', 0n, 500n, 1n);
  }, 'commit_dataset rejects record_count=0');
}

// ── prove_training circuit (valid inputs) ────────────────────────────────────
console.log('\n  \x1b[36m── prove_training ──\x1b[0m');
{
  const env = initContract(DatasetContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.prove_training(
    ctx, 'ds-001', 'model_hash_abc', 'schema_hash_hr', 800n
  );
  assert(result !== undefined, 'prove_training executes (training_rows=800 > 0)');
  assert(result.proofData !== undefined, 'prove_training produces proofData');
}

// ── prove_training: MUST reject training_rows=0 ─────────────────────────────
{
  const env = initContract(DatasetContract);
  assertThrows(() => {
    const ctx = freshCtx(env);
    env.contract.impureCircuits.prove_training(ctx, 'ds-001', 'model', 'schema', 0n);
  }, 'prove_training rejects training_rows=0');
}

// ── prove_training: single row is allowed ────────────────────────────────────
{
  const env = initContract(DatasetContract);
  const ctx = freshCtx(env);
  const result = env.contract.impureCircuits.prove_training(ctx, 'ds-001', 'model_min', 'schema', 1n);
  assert(result.proofData !== undefined, 'prove_training allows training_rows=1 (edge case)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n\x1b[1m═══ RESULTS ═══\x1b[0m`);
console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);
console.log(`  Total:  ${passed + failed}\n`);

if (failed > 0) process.exit(1);
