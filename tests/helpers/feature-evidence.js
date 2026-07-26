'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  prepareReview,
  checkReview
} = require('../../src/review-intelligence/engine');

async function approveAndSealSheldonReview(root, slug = 'demo') {
  for (const agent of ['product', 'sheldon', 'planner', 'dev', 'qa']) {
    const source = path.join(
      __dirname,
      '..',
      '..',
      'template',
      '.aioson',
      'agents',
      'manifests',
      `${agent}.manifest.json`
    );
    const target = path.join(root, '.aioson', 'agents', 'manifests', `${agent}.manifest.json`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }

  const prdPath = path.join(root, '.aioson/context', `prd-${slug}.md`);
  let prd = await fs.readFile(prdPath, 'utf8');
  if (/^sheldon_review:/m.test(prd)) {
    prd = prd.replace(/^sheldon_review:.*$/m, 'sheldon_review: approved');
  } else if (/^---\r?\n/.test(prd)) {
    prd = prd.replace(/^---\r?\n/, '---\nsheldon_review: approved\n');
  } else {
    prd = `---\nsheldon_review: approved\n---\n\n${prd}`;
  }
  await fs.writeFile(prdPath, prd, 'utf8');

  const prepared = await prepareReview({
    rootDir: root,
    featureSlug: slug,
    agent: 'sheldon',
    artifactPath: `.aioson/context/prd-${slug}.md`
  });
  const report = {
    ...prepared.report_template,
    review_status: 'pass',
    summary: 'Source promises, product decisions, capabilities, acceptance criteria, and prototype authority are complete and internally consistent.',
    findings: [],
    completed_at: new Date().toISOString()
  };
  const draftPath = path.join(root, prepared.draft_path);
  await fs.mkdir(path.dirname(draftPath), { recursive: true });
  await fs.writeFile(draftPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return checkReview({
    rootDir: root,
    featureSlug: slug,
    agent: 'sheldon',
    reportPath: prepared.draft_path
  });
}

function qaExecutionReport({
  slug = 'demo',
  cap = `CAP-${slug}-01`,
  ac = `AC-${slug}-01`,
  verdict = 'pass',
  command = 'npm test -- --runInBand',
  entry = 'npm start',
  trigger = 'User submits a valid value in the normal application',
  boundary = 'Production submit handler writes through the real repository boundary',
  stateChange = 'Saved value is persisted and can be read back',
  visibleResult = 'The saved value appears in the normal application'
} = {}) {
  return `---
feature: ${slug}
verdict: ${verdict}
verified_at: 2026-07-26T12:00:00.000Z
production_entry: ${entry}
---

# QA Report

## Verdict and blocking findings

${verdict.toUpperCase()} — no blocking findings remain.

## CAP/AC evidence table

| CAP | AC | Result | Evidence |
|---|---|---|---|
| ${cap} | ${ac} | PASS | \`${command}\` passed and the production-path observation reproduced the promised behavior |

## Commands executed and results

- \`${command}\`: PASS (exit code 0)

## Production-path smoke

- Entry: ${entry}
- Trigger: ${trigger}
- Real boundary: ${boundary}
- State change: ${stateChange}
- Visible result: ${visibleResult}

## Prototype fidelity and approved deviations

No unapproved deviation.
`;
}

module.exports = {
  approveAndSealSheldonReview,
  qaExecutionReport
};
