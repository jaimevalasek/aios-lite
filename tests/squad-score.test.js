'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { scoreCompletude, scoreProfundidade, scoreQualidadeEstrutural, scorePotencial, gradeFromScore, runSquadScore } = require('../src/commands/squad-score');

// --- gradeFromScore ---

test('gradeFromScore returns S for 90+', () => {
  assert.match(gradeFromScore(90), /^S/);
  assert.match(gradeFromScore(100), /^S/);
});

test('gradeFromScore returns A for 80-89', () => {
  assert.match(gradeFromScore(80), /^A/);
  assert.match(gradeFromScore(89), /^A/);
});

test('gradeFromScore returns B for 70-79', () => {
  assert.match(gradeFromScore(70), /^B/);
  assert.match(gradeFromScore(79), /^B/);
});

test('gradeFromScore returns C for 50-69', () => {
  assert.match(gradeFromScore(50), /^C/);
  assert.match(gradeFromScore(69), /^C/);
});

test('gradeFromScore returns D for < 50', () => {
  assert.match(gradeFromScore(0), /^D/);
  assert.match(gradeFromScore(49), /^D/);
});

// --- scoreCompletude ---

test('scoreCompletude returns 0 for empty manifest', () => {
  const result = scoreCompletude({});
  assert.equal(result.score, 0);
  assert.equal(result.max, 25);
});

test('scoreCompletude scores executors typed', () => {
  const result = scoreCompletude({
    executors: [{ type: 'agent' }, { type: 'worker' }]
  });
  assert.ok(result.details.executorsTyped);
  assert.ok(result.score >= 5);
});

test('scoreCompletude scores workflow defined', () => {
  const result = scoreCompletude({
    workflows: [{ phases: [{ id: 'a' }, { id: 'b' }] }]
  });
  assert.ok(result.details.workflowDefined);
});

test('scoreCompletude scores checklists present', () => {
  const result = scoreCompletude({
    checklists: [{ name: 'quality' }]
  });
  assert.ok(result.details.checklistsPresent);
});

test('scoreCompletude scores tasks decomposed', () => {
  const result = scoreCompletude({
    executors: [{ tasks: [{ slug: 't1' }] }]
  });
  assert.ok(result.details.tasksDecomposed);
});

test('scoreCompletude scores workers present', () => {
  const result = scoreCompletude({
    executors: [{ type: 'worker' }]
  });
  assert.ok(result.details.workersPresent);
});

test('scoreCompletude scores investigation report', () => {
  const result = scoreCompletude({ _investigationPath: '/some/path' });
  assert.ok(result.details.investigationReport);
});

test('scoreCompletude scores model tiering', () => {
  const result = scoreCompletude({
    executors: [{ type: 'agent', modelTier: 'powerful' }, { type: 'worker', modelTier: 'none' }]
  });
  assert.ok(result.details.modelTiering);
});

// --- scoreProfundidade ---

test('scoreProfundidade returns 0 for empty manifest', () => {
  const result = scoreProfundidade({});
  assert.equal(result.score, 0);
  assert.equal(result.max, 25);
});

test('scoreProfundidade scores focus areas', () => {
  const result = scoreProfundidade({
    executors: [{ focus: ['a', 'b', 'c'] }]
  });
  assert.ok(result.details.focusAreas);
});

test('scoreProfundidade scores veto conditions', () => {
  const result = scoreProfundidade({
    workflows: [{ phases: [{ vetoConditions: ['no-plagiarism'] }] }]
  });
  assert.ok(result.details.vetoConditions);
});

test('scoreProfundidade scores content blueprints', () => {
  const result = scoreProfundidade({
    contentBlueprints: [{ sections: ['intro', 'body', 'conclusion'] }]
  });
  assert.ok(result.details.contentBlueprints);
});

test('scoreProfundidade scores skills declared', () => {
  const result = scoreProfundidade({
    skills: [{ slug: 'a' }, { slug: 'b' }]
  });
  assert.ok(result.details.skillsDeclared);
});

// --- scoreQualidadeEstrutural ---

test('scoreQualidadeEstrutural returns 0 for empty manifest', () => {
  const result = scoreQualidadeEstrutural({});
  assert.equal(result.score, 0);
  assert.equal(result.max, 25);
});

test('scoreQualidadeEstrutural scores review loops', () => {
  const result = scoreQualidadeEstrutural({
    workflows: [{ phases: [{ review: { reviewer: 'qa' } }] }]
  });
  assert.ok(result.details.reviewLoops);
});

test('scoreQualidadeEstrutural scores human gates', () => {
  const result = scoreQualidadeEstrutural({
    workflows: [{ phases: [{ humanGate: true }] }]
  });
  assert.ok(result.details.humanGates);
});

test('scoreQualidadeEstrutural scores cross-squad ports', () => {
  const result = scoreQualidadeEstrutural({
    ports: { inputs: ['data-feed'] }
  });
  assert.ok(result.details.crossSquad);
});

test('scoreQualidadeEstrutural scores output strategy', () => {
  const result = scoreQualidadeEstrutural({
    outputStrategy: { mode: 'hybrid' }
  });
  assert.ok(result.details.outputStrategy);
});

test('scoreQualidadeEstrutural scores genome bindings', () => {
  const result = scoreQualidadeEstrutural({
    genomes: [{ slug: 'persona-x' }]
  });
  assert.ok(result.details.genomeBindings);
});

test('scoreQualidadeEstrutural scores format references', () => {
  const result = scoreQualidadeEstrutural({
    executors: [{ formats: ['youtube-long'] }]
  });
  assert.ok(result.details.formatReferences);
});

// --- scorePotencial ---

test('scorePotencial returns 0 for empty manifest', () => {
  const result = scorePotencial({});
  assert.equal(result.score, 0);
  assert.equal(result.max, 25);
});

test('scorePotencial scores anti-pattern guards', () => {
  const result = scorePotencial({
    workflows: [{ phases: [{ vetoConditions: ['no-clickbait'] }] }]
  });
  assert.ok(result.details.antiPatternGuards);
});

test('scorePotencial scores domain vocabulary via investigation', () => {
  const result = scorePotencial({ _investigationPath: '/some/path' });
  assert.ok(result.details.domainVocabulary);
});

test('scorePotencial scores structural patterns via blueprints', () => {
  const result = scorePotencial({
    contentBlueprints: [{ name: 'article' }]
  });
  assert.ok(result.details.structuralPatterns);
});

test('scorePotencial always marks llmAssessmentPending', () => {
  const result = scorePotencial({});
  assert.ok(result.details.llmAssessmentPending);
});

// --- runSquadScore ---

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-score-'));
}

test('runSquadScore returns error when no slug provided', async () => {
  const logs = [];
  const result = await runSquadScore({
    args: ['/tmp'],
    options: {},
    logger: { log() {}, error(m) { logs.push(m); } }
  });
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test('runSquadScore returns error when manifest not found', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logs = [];
    const result = await runSquadScore({
      args: [tmpDir],
      options: { squad: 'nonexistent' },
      logger: { log() {}, error(m) { logs.push(m); } }
    });
    assert.equal(result.valid, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadScore scores a valid manifest and returns grade', async () => {
  const tmpDir = await makeTempDir();
  try {
    const squadDir = path.join(tmpDir, '.aioson', 'squads', 'test-squad');
    await fs.mkdir(squadDir, { recursive: true });
    await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify({
      executors: [
        { type: 'agent', modelTier: 'powerful', focus: ['a', 'b', 'c'], tasks: [{ slug: 't1' }], formats: ['blog-post'] },
        { type: 'worker', modelTier: 'none', usesLLM: false }
      ],
      workflows: [{ phases: [{ id: 'p1', review: { reviewer: 'qa' }, humanGate: true, vetoConditions: ['no-plagiarism'] }, { id: 'p2' }] }],
      checklists: [{ name: 'quality' }],
      skills: [{ slug: 's1' }, { slug: 's2' }],
      contentBlueprints: [{ name: 'article', sections: ['intro', 'body', 'conclusion'] }],
      outputStrategy: { mode: 'hybrid' },
      genomes: [{ slug: 'persona-x' }],
      ports: { inputs: ['feed'] }
    }));

    const logs = [];
    const result = await runSquadScore({
      args: [tmpDir],
      options: { squad: 'test-squad' },
      logger: { log(m) { logs.push(m); }, error(m) { logs.push(m); } }
    });

    assert.equal(result.slug, 'test-squad');
    assert.ok(result.total > 0);
    assert.ok(result.max === 100);
    assert.ok(result.grade);
    assert.ok(result.dimensions);
    assert.ok(result.dimensions.completude);
    assert.ok(result.dimensions.profundidade);
    assert.ok(result.dimensions.qualidade);
    assert.ok(result.dimensions.potencial);
    assert.ok(Array.isArray(result.quickWins));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadScore gives high score to a complete manifest', async () => {
  const tmpDir = await makeTempDir();
  try {
    const squadDir = path.join(tmpDir, '.aioson', 'squads', 'complete');
    await fs.mkdir(squadDir, { recursive: true });

    // Also create investigation directory
    const investigationDir = path.join(tmpDir, 'squad-searches', 'complete');
    await fs.mkdir(investigationDir, { recursive: true });

    await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify({
      executors: [
        { type: 'agent', modelTier: 'powerful', focus: ['a', 'b', 'c'], tasks: [{ slug: 't1' }], formats: ['blog-post'] },
        { type: 'worker', modelTier: 'none', usesLLM: false, focus: ['d', 'e', 'f'] }
      ],
      workflows: [{
        phases: [
          { id: 'p1', review: { reviewer: 'qa' }, humanGate: true, vetoConditions: ['no-plagiarism'] },
          { id: 'p2' }
        ]
      }],
      checklists: [{ name: 'quality' }],
      skills: [{ slug: 's1' }, { slug: 's2' }],
      contentBlueprints: [{ name: 'article', sections: ['intro', 'body', 'conclusion'] }],
      outputStrategy: { mode: 'hybrid' },
      genomes: [{ slug: 'persona-x' }],
      ports: { inputs: ['feed'] }
    }));

    const result = await runSquadScore({
      args: [tmpDir],
      options: { squad: 'complete' },
      logger: { log() {}, error() {} }
    });

    // With investigation dir, all scoring criteria met, expect high score
    assert.ok(result.total >= 70, `Expected score >= 70, got ${result.total}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
