'use strict';

const PLACEHOLDER = /\b(?:todo|tbd|pending|pendente|preenchid[oa]|filled after|to be filled|lorem ipsum|n\/a)\b/i;

function sectionBody(markdown, heading) {
  const escaped = String(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(markdown || '').match(new RegExp(`(?:^|\\n)##\\s+${escaped}[^\\n]*((?:\\n(?!##\\s)[^\\n]*)*)`, 'i'));
  return match ? match[1].trim() : '';
}

function labeledValue(body, labels) {
  const alternatives = labels.map((label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = String(body || '').match(new RegExp(`^\\s*[-*]?\\s*(?:${alternatives})\\s*:\\s*(.+?)\\s*$`, 'mi'));
  return match ? match[1].trim().replace(/^`|`$/g, '') : '';
}

function substantive(value, floor = 8) {
  const text = String(value || '').replace(/[_*`]/g, '').trim();
  return text.length >= floor && !PLACEHOLDER.test(text);
}

function parseRuntimeMatrix(markdown) {
  const body = sectionBody(markdown, 'Runtime matrix');
  if (!body) return [];
  const stateNames = new Set(['loading', 'empty', 'error', 'disabled', 'success']);
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s*([^:]+):\s*(.+?)\s*$/);
    if (!match) continue;
    const name = match[1].trim().toLowerCase().replace(/\s+/g, '-');
    let route = match[2].trim().replace(/^`|`$/g, '');
    const annotated = route.match(/^(.*?)\s+\|\s*state\s*=\s*([\w-]+)\s*$/i);
    const state = annotated ? annotated[2].toLowerCase() : (stateNames.has(name) ? name : null);
    if (annotated) route = annotated[1].trim();
    if (!route || /^(?:none|null|n\/a)$/i.test(route)) continue;
    rows.push({ name, route, state });
  }
  return rows;
}

function validateVisualDirection(markdown) {
  const body = sectionBody(markdown, 'Visual direction');
  const fields = {
    register: labeledValue(body, ['register', 'registro']),
    thesis: labeledValue(body, ['thesis', 'tese']),
    anti_goals: labeledValue(body, ['anti-goals', 'anti goals', 'antiobjetivos', 'anti-objetivos']),
    composition_signature: labeledValue(body, ['composition signature', 'signature composition', 'assinatura de composição', 'signature move', 'movimento assinatura'])
  };
  const missing = [];
  if (!substantive(fields.register, 3)) missing.push('register');
  if (!substantive(fields.thesis, 12)) missing.push('thesis');
  if (!substantive(fields.anti_goals, 12) || fields.anti_goals.split(/[,;|]/).filter((item) => substantive(item, 3)).length < 2) missing.push('anti-goals (at least two)');
  if (!substantive(fields.composition_signature, 16)) missing.push('composition signature');
  return { valid: body.length > 0 && missing.length === 0, body, fields, missing };
}

function validateQualityEvidence(markdown, { report = null, slug = null } = {}) {
  const body = sectionBody(markdown, 'Quality evidence');
  const fields = {
    verdict: labeledValue(body, ['verdict', 'veredito']).toLowerCase(),
    evidence: labeledValue(body, ['evidence', 'evidência', 'evidencia']),
    craft: labeledValue(body, ['craft', 'acabamento']),
    runtime: labeledValue(body, ['runtime']),
    routes: labeledValue(body, ['routes', 'rotas'])
  };
  const missing = [];
  if (!/^(?:pass|fail|unverified)$/.test(fields.verdict)) missing.push('verdict: pass|fail|unverified');
  if (!substantive(fields.evidence, 16) || !/visual-evidence\.json\b/i.test(fields.evidence)) missing.push('evidence: .../visual-evidence.json');
  if (!/^\d+\s*\/\s*\d+\b/.test(fields.craft) && !/^runtime\s+\d+\s*\/\s*\d+\b/i.test(fields.craft)) missing.push('craft: N/N');
  if (!substantive(fields.runtime, 8)) missing.push('runtime: measured|unavailable/waived + reason');
  if (!/^\d+\b/.test(fields.routes)) missing.push('routes: N');

  const mismatches = [];
  if (report) {
    const actualVerdict = report.verdict || (report.ok ? 'pass' : 'fail');
    if (fields.verdict && fields.verdict !== actualVerdict) mismatches.push(`verdict says ${fields.verdict}, report says ${actualVerdict}`);
    const expectedEvidence = slug ? `.aioson/context/features/${slug}/visual-evidence.json` : 'visual-evidence.json';
    const declaredEvidence = fields.evidence.replace(/\\/g, '/').replace(/^\.\//, '');
    if (fields.evidence && declaredEvidence !== expectedEvidence) mismatches.push(`evidence does not exactly bind ${expectedEvidence}`);
    const metrics = report.metrics || {};
    if (metrics.craft && metrics.craft.measured) {
      const expectedCraft = `${metrics.craft.active_levers}/${metrics.craft.lever_count || 5}`;
      if (fields.craft && !new RegExp(`(?:^|\\s)${expectedCraft.replace('/', '\\/')}(?:\\s|$)`).test(fields.craft)) mismatches.push(`craft says ${fields.craft}, report says ${expectedCraft}`);
    } else if (metrics.runtime && metrics.runtime.available && metrics.runtime.assurance && metrics.runtime.assurance.craft_axes) {
      const axes = metrics.runtime.assurance.craft_axes;
      const expectedCraft = `${Object.values(axes).filter(Boolean).length}/${Object.keys(axes).length || 5}`;
      if (fields.craft && !new RegExp(`(?:^|\\s)${expectedCraft.replace('/', '\\/')}(?:\\s|$)`).test(fields.craft)) mismatches.push(`craft says ${fields.craft}, runtime report says ${expectedCraft}`);
    }
    const runtime = metrics.runtime;
    if (runtime && runtime.available && !/\bmeasured\b|\bmedid[oa]\b/i.test(fields.runtime)) mismatches.push('runtime report is measured but manifest does not say measured');
    if ((!runtime || !runtime.available) && !/\b(?:unavailable|indispon[ií]vel|waived|dispensad[oa]|declined|recusad[oa])\b/i.test(fields.runtime)) {
      mismatches.push('runtime was not measured and manifest records no unavailable/waived decision');
    }
    const routeCount = runtime && runtime.assurance && runtime.assurance.routes_verified
      ? runtime.assurance.routes_verified.length
      : 0;
    if (fields.routes && Number.parseInt(fields.routes, 10) !== routeCount) mismatches.push(`routes says ${fields.routes}, report verified ${routeCount}`);
  }
  return { valid: body.length > 0 && missing.length === 0 && mismatches.length === 0, body, fields, missing, mismatches };
}

function validatePrototypeManifestQuality(markdown, { report = null, slug = null, requireEvidence = false } = {}) {
  const direction = validateVisualDirection(markdown);
  const quality = validateQualityEvidence(markdown, { report, slug });
  const runtimeMatrix = parseRuntimeMatrix(markdown);
  const issues = [];
  const warnings = [];
  if (!direction.valid) {
    issues.push(`Visual direction is not decision-grade — missing or placeholder: ${direction.missing.join(', ') || 'section'}`);
  }
  if (requireEvidence && !quality.valid) {
    issues.push(`Quality evidence is not bound to the measured report — ${[...quality.missing, ...quality.mismatches].join('; ') || 'section missing'}`);
  } else if (!requireEvidence && quality.body && !quality.valid) {
    warnings.push(`Quality evidence is incomplete — ${[...quality.missing, ...quality.mismatches].join('; ')}`);
  }
  return { ok: issues.length === 0, issues, warnings, direction, quality, runtime_matrix: runtimeMatrix };
}

module.exports = {
  labeledValue,
  parseRuntimeMatrix,
  sectionBody,
  validatePrototypeManifestQuality,
  validateQualityEvidence,
  validateVisualDirection
};
