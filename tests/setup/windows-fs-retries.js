'use strict';

// Loaded via --require by the npm test script (the test runner propagates
// exec flags to its child processes, so every test file gets this).
//
// Windows only: antivirus and indexing services briefly hold handles inside
// freshly-written temp trees, so recursive cleanup randomly dies with
// ENOTEMPTY/EBUSY/EPERM — the recurring `rmdir ENOTEMPTY` flake in suite
// runs. Node's own remedy is fs.rm's retry knobs; this injects them as a
// default (never overriding a caller's explicit choice) for recursive
// removals during tests, on the platform where the race exists. Linux and
// macOS keep strict semantics, so a genuine handle leak still fails loudly
// somewhere.

if (process.platform === 'win32') {
  const fs = require('node:fs');

  const withRetries = (options) =>
    options && typeof options === 'object' && options.recursive && options.maxRetries === undefined
      ? { ...options, maxRetries: 5, retryDelay: 120 }
      : options;

  const promisesRm = fs.promises.rm.bind(fs.promises);
  fs.promises.rm = (target, options) => promisesRm(target, withRetries(options));
  fs.promises.rm.aiosonWindowsRetries = true;

  const rmSync = fs.rmSync.bind(fs);
  fs.rmSync = (target, options) => rmSync(target, withRetries(options));

  const rm = fs.rm.bind(fs);
  fs.rm = (target, options, callback) => {
    if (typeof options === 'function') return rm(target, options);
    return rm(target, withRetries(options), callback);
  };
}
