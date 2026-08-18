'use strict';

const path = require('node:path');
const { scaffoldRule } = require('../lib/rule-scaffold');
const { resolveTargetDir } = require('../lib/project-root');

function translated(t, key, values, fallback) {
  if (typeof t !== 'function') return fallback;
  const value = t(key, values);
  return value === key ? fallback : value;
}

const ERRORS = {
  name_required: ['cli.rule_new.name_required', 'rule:new requires --name=<kebab-case-name>.'],
  invalid_name: ['cli.rule_new.invalid_name', 'Rule name "{name}" must be kebab-case (letters, digits, single hyphens).'],
  not_an_aioson_project: ['cli.rule_new.not_project', 'No .aioson/ directory here — run this inside an AIOSON project.'],
  already_exists: ['cli.rule_new.exists', 'Rule "{name}" already exists at {path}. Edit it, or pass --force to replace it.'],
  invalid_load_tier: ['cli.rule_new.invalid_load_tier', 'load_tier must be `always` or `trigger`.'],
  invalid_priority: ['cli.rule_new.invalid_priority', 'priority must be a number between 0 and 100.']
};

async function runRuleNew({ args, options = {}, logger, t }) {
  const projectDir = resolveTargetDir(args);
  const result = await scaffoldRule(projectDir, options);

  if (!result.ok) {
    const [key, fallback] = ERRORS[result.reason] || ['cli.rule_new.error', 'rule:new failed ({reason}).'];
    logger.error(translated(t, key, result, fallback
      .replace('{name}', result.name || '-')
      .replace('{path}', result.path || '-')
      .replace('{reason}', result.reason)));
    return result;
  }

  if (options.json) return result;

  logger.log(translated(
    t,
    result.overwritten ? 'cli.rule_new.replaced' : 'cli.rule_new.created',
    result,
    `${result.overwritten ? 'Replaced' : 'Created'} rule "${result.name}" at ${result.path}.`
  ));
  if (result.warnings.includes('no_routing_dimension')) {
    logger.log(translated(
      t,
      'cli.rule_new.no_routing_dimension',
      result,
      'Warning: no agents, triggers, task-types, or paths were declared, so context:select will rarely reach this rule. Add at least one, or set --load-tier=always.'
    ));
  }
  logger.log(translated(
    t,
    'cli.rule_new.next',
    result,
    `Next: replace the placeholder rule statements with concrete, checkable requirements, then run aioson verify:artifact . --kind=rule --file=${result.path}`
  ));
  return result;
}

module.exports = {
  runRuleNew
};
