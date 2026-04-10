'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * CT-04: @validator — Output JSON (AC-HD-09)
 * Este teste valida a estrutura do contrato de dados que o framework espera do agente @validator.
 */
test('validator: esquema de output JSON deve seguir o contrato RF-VAL', () => {
  const mockValidatorOutput = {
    "phase": 1,
    "validation_at": "2026-04-10T20:30:00Z",
    "results": [
      {
        "id": "C1",
        "passed": true,
        "reason": null
      },
      {
        "id": "C2",
        "passed": false,
        "reason": "Missing export in src/harness/circuit-breaker.js"
      }
    ],
    "overall_score": 0,
    "ready_for_done_gate": false
  };

  // Validação de campos obrigatórios
  assert.ok(mockValidatorOutput.hasOwnProperty('phase'), 'Deve ter campo phase');
  assert.ok(mockValidatorOutput.hasOwnProperty('validation_at'), 'Deve ter campo validation_at');
  assert.ok(Array.isArray(mockValidatorOutput.results), 'results deve ser um array');
  assert.ok(mockValidatorOutput.hasOwnProperty('overall_score'), 'Deve ter campo overall_score');
  assert.ok(mockValidatorOutput.hasOwnProperty('ready_for_done_gate'), 'Deve ter campo ready_for_done_gate');

  // Validação de tipos
  assert.strictEqual(typeof mockValidatorOutput.phase, 'number');
  assert.strictEqual(typeof mockValidatorOutput.overall_score, 'number');
  assert.strictEqual(typeof mockValidatorOutput.ready_for_done_gate, 'boolean');

  // Validação do item de resultado
  const firstResult = mockValidatorOutput.results[0];
  assert.ok(firstResult.id, 'Resultado deve ter ID');
  assert.strictEqual(typeof firstResult.passed, 'boolean');
});
