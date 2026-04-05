'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// We test only the pure functions that don't require an active bus session.
// Integration tests for bridgeMailboxToBus/readBusForMailbox are out of scope
// (they require a live intra-bus with a session file on disk).
const { inferMessageType } = require('../src/squad/bus-bridge');

// ─── inferMessageType ────────────────────────────────────────────────────────

test('inferMessageType returns "block" for blocking messages', () => {
  assert.equal(inferMessageType('I am block on the auth module'), 'block');
  assert.equal(inferMessageType('stuck waiting for the API'), 'block');
  assert.equal(inferMessageType('cannot proceed without the schema'), 'block');
  assert.equal(inferMessageType('unable to continue'), 'block');
  assert.equal(inferMessageType('need help with this error'), 'block');
});

test('inferMessageType returns "result" for completion messages', () => {
  assert.equal(inferMessageType('done with research phase'), 'result');
  assert.equal(inferMessageType('task completed successfully'), 'result');
  assert.equal(inferMessageType('finished the script'), 'result');
  assert.equal(inferMessageType('result: here is the output'), 'result');
});

test('inferMessageType returns "finding" for discovery messages', () => {
  assert.equal(inferMessageType('found an interesting pattern in the data'), 'finding');
  assert.equal(inferMessageType('discovered that the API has rate limits'), 'finding');
  assert.equal(inferMessageType('noticed a bug in the auth flow'), 'finding');
});

test('inferMessageType returns "question" for interrogative messages', () => {
  assert.equal(inferMessageType('question: should we use JWT or sessions?'), 'question');
  assert.equal(inferMessageType('how should I handle the error?'), 'question');
  assert.equal(inferMessageType('what is the expected output format?'), 'question');
  assert.equal(inferMessageType('why does the test fail?'), 'question');
  assert.equal(inferMessageType('should we include pagination?'), 'question');
});

test('inferMessageType returns "feedback" for review messages', () => {
  assert.equal(inferMessageType('review this implementation'), 'feedback');
  assert.equal(inferMessageType('feedback on the script draft'), 'feedback');
  assert.equal(inferMessageType('suggest some improvements'), 'feedback');
});

test('inferMessageType returns "status" for generic messages', () => {
  assert.equal(inferMessageType('working on phase 2'), 'status');
  assert.equal(inferMessageType('starting the research task'), 'status');
  assert.equal(inferMessageType('processing the data'), 'status');
  assert.equal(inferMessageType(''), 'status');
  assert.equal(inferMessageType(null), 'status');
  assert.equal(inferMessageType(undefined), 'status');
});

test('inferMessageType is case-insensitive for word-boundary matches', () => {
  // The regex uses \b word boundaries — matches standalone words, case-insensitive
  assert.equal(inferMessageType('DONE with task'), 'result');
  assert.equal(inferMessageType('I am BLOCK on this'), 'block');   // standalone BLOCK
  assert.equal(inferMessageType('FOUND a pattern'), 'finding');
});

test('inferMessageType returns result when "done" appears before "block" in message', () => {
  // "done" matches the result pattern; "blocked" does NOT match \bblock\b (has suffix -ed)
  const result = inferMessageType('done with what I could but still blocked on API');
  assert.equal(result, 'result'); // "done" is detected, not "blocked"
});
