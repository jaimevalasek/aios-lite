const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createCircuitBreaker } = require('../../src/harness/circuit-breaker');

const TMP_CONTRACT = path.join(__dirname, 'test-contract.json');
const TMP_PROGRESS = path.join(__dirname, 'test-progress.json');

const mockContract = {
  feature: 'test-feature',
  governor: {
    max_steps: 3,
    error_streak_limit: 2
  }
};

async function runTests() {
  console.log('🧪 Iniciando testes: CircuitBreaker');

  // Setup
  fs.writeFileSync(TMP_CONTRACT, JSON.stringify(mockContract));
  if (fs.existsSync(TMP_PROGRESS)) fs.unlinkSync(TMP_PROGRESS);

  const cb = createCircuitBreaker(TMP_CONTRACT, TMP_PROGRESS);
  await cb.load();

  // Teste 1: Estado inicial
  console.log('  - Teste 1: Estado inicial');
  assert.strictEqual(cb.getState(), 'CLOSED');
  assert.deepStrictEqual(cb.check(), { allowed: true, reason: null });

  // Teste 2: Registro de erro e abertura por streak
  console.log('  - Teste 2: Abertura por streak');
  await cb.recordError('Erro 1');
  assert.strictEqual(cb.getState(), 'CLOSED');
  assert.deepStrictEqual(cb.check(), { allowed: true, reason: null });

  await cb.recordError('Erro 2');
  assert.strictEqual(cb.getState(), 'OPEN');
  assert.deepStrictEqual(cb.check(), { allowed: false, reason: 'circuit_open' });

  // Teste 3: Reset de erros ao ter sucesso (Manualmente forçando CLOSED para testar)
  console.log('  - Teste 3: Reset de erros');
  cb.progress.circuit_state = 'CLOSED';
  cb.progress.consecutive_errors = 1;
  await cb.recordSuccess();
  assert.strictEqual(cb.progress.consecutive_errors, 0);
  assert.strictEqual(cb.progress.iterations, 1);

  // Teste 4: Abertura por max_steps
  console.log('  - Teste 4: Abertura por max_steps');
  cb.progress.iterations = 3;
  assert.deepStrictEqual(cb.check(), { allowed: false, reason: 'max_steps_reached' });

  // Cleanup
  fs.unlinkSync(TMP_CONTRACT);
  if (fs.existsSync(TMP_PROGRESS)) fs.unlinkSync(TMP_PROGRESS);

  console.log('✅ Testes concluídos com sucesso!');
}

runTests().catch(err => {
  console.error('❌ Falha nos testes:');
  console.error(err);
  process.exit(1);
});
