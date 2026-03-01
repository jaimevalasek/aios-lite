'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranslator, normalizeLocale } = require('../src/i18n');

test('normalizeLocale falls back to en', () => {
  assert.equal(normalizeLocale('pt-BR'), 'pt-br');
  assert.equal(normalizeLocale('pt_br'), 'pt-br');
  assert.equal(normalizeLocale('pt'), 'pt-br');
  assert.equal(normalizeLocale('es-MX'), 'es');
  assert.equal(normalizeLocale('fr-CA'), 'fr');
  assert.equal(normalizeLocale('EN-us'), 'en');
  assert.equal(normalizeLocale(undefined), 'en');
});

test('normalizeLocale resolves base locale when region variant is requested', () => {
  const resolved = normalizeLocale('fr-CA', { en: {}, fr: {} });
  assert.equal(resolved, 'fr');
});

test('translator returns english messages and key fallback', () => {
  const { t } = createTranslator('en');
  assert.equal(t('cli.title'), 'AIOS Lite CLI');
  assert.equal(t('not.exists.key'), 'not.exists.key');
});

test('translator resolves pt-BR dictionary', () => {
  const { locale, t } = createTranslator('pt-BR');
  assert.equal(locale, 'pt-br');
  assert.equal(t('cli.title'), 'CLI do AIOS Lite');
  assert.equal(t('cli.usage'), 'Uso:');
});

test('translator resolves regional variants to es and fr dictionaries', () => {
  const es = createTranslator('es-MX');
  assert.equal(es.locale, 'es');
  assert.equal(es.t('cli.usage'), 'Uso:');
  assert.equal(es.t('cli.unknown_command', { command: 'x' }), 'Comando desconocido: x');

  const fr = createTranslator('fr_CA');
  assert.equal(fr.locale, 'fr');
  assert.equal(fr.t('cli.usage'), 'Utilisation :');
  assert.equal(fr.t('cli.unknown_command', { command: 'x' }), 'Commande inconnue : x');
});

test('translator exposes parse reason unknown fallback key per locale', () => {
  const en = createTranslator('en');
  const pt = createTranslator('pt-BR');
  const es = createTranslator('es');
  const fr = createTranslator('fr');

  assert.equal(en.t('context_validate.parse_reason_unknown'), 'unknown');
  assert.equal(pt.t('context_validate.parse_reason_unknown'), 'desconhecido');
  assert.equal(es.t('context_validate.parse_reason_unknown'), 'desconocido');
  assert.equal(fr.t('context_validate.parse_reason_unknown'), 'inconnu');
});
