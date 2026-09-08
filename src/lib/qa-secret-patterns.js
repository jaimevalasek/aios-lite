'use strict';

// Stripe publishable pk_* keys are designed for client use; only sk/rk
// credentials are secret. Patterns are shared by both browser QA commands.
const SECRET_PATTERNS = Object.freeze([
  { name: 'OpenAI key', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe live secret key', regex: /\bsk_live_[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe test secret key', regex: /\bsk_test_[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe live restricted key', regex: /\brk_live_[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe test restricted key', regex: /\brk_test_[a-zA-Z0-9]{20,}/ },
  { name: 'AWS access key', regex: /AKIA[A-Z0-9]{16}/ },
  { name: 'Google API key', regex: /AIzaSy[a-zA-Z0-9_-]{33}/ },
  { name: 'GitHub token', regex: /gh[ps]_[a-zA-Z0-9]{36}/ },
  { name: 'Slack token', regex: /xox[bpa]-[a-zA-Z0-9-]+/ },
  { name: 'Generic secret', regex: /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[:=]\s*['"]?(?!pk_(?:live|test)_)[a-zA-Z0-9_/+=-]{16,}/i }
]);

const browserSecretPatterns = () => SECRET_PATTERNS.map(({ name, regex }) => ({ name, regex: regex.source, flags: regex.flags }));

function stripPublicStripeConfig(body) {
  // Remove only a public key and its assignment, never the rest of the line:
  // a neighboring password/secret must still reach the sensitive-file heuristic.
  return body.replace(/(?:["']?[\w.-]+["']?\s*[:=]\s*["']?)?\bpk_(?:live|test)_[a-zA-Z0-9]{20,}(?![a-zA-Z0-9_])["']?/g, '');
}

module.exports = { SECRET_PATTERNS, browserSecretPatterns, stripPublicStripeConfig };
