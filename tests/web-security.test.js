'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isPrivateIpAddress,
  assertSafeRemoteUrl,
  resolveSafeRemoteUrl,
  fetchPage
} = require('../src/web');

test('AC-premium-01 safe research rejects private and link-local addresses', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.1.2',
    '172.16.0.1',
    '192.168.1.2',
    '::1',
    'fd00::1',
    '::ffff:7f00:1',
    '::ffff:172.16.0.1',
    '2001:db8::1',
    '203.0.113.10'
  ]) {
    assert.equal(isPrivateIpAddress(address), true, address);
  }
  assert.equal(isPrivateIpAddress('93.184.216.34'), false);
  assert.equal(isPrivateIpAddress('2606:4700:4700::1111'), false);
});

test('safe research rejects localhost without performing DNS lookup', async () => {
  let lookups = 0;
  await assert.rejects(
    assertSafeRemoteUrl('http://localhost/admin', {
      lookup: async () => { lookups += 1; return [{ address: '203.0.113.10' }]; }
    }),
    /private remote host/i
  );
  assert.equal(lookups, 0);
});

test('safe research rejects a public hostname resolving to a private address before fetch', async () => {
  let fetchCalls = 0;
  await assert.rejects(
    fetchPage('https://example.test/source', {
      safeRemote: true,
      lookup: async () => [{ address: '127.0.0.1' }],
      fetch: async () => { fetchCalls += 1; throw new Error('must not fetch'); }
    }),
    /resolves to a private address/i
  );
  assert.equal(fetchCalls, 0);
});

test('safe research rejects hexadecimal IPv4-mapped IPv6 loopback returned by DNS', async () => {
  await assert.rejects(
    assertSafeRemoteUrl('https://example.test/source', {
      lookup: async () => [{ address: '::ffff:7f00:1', family: 6 }]
    }),
    /resolves to a private address/i
  );
});

test('safe research rejects malformed or family-confused DNS answers', async () => {
  await assert.rejects(
    resolveSafeRemoteUrl('https://example.com', {
      lookup: async () => [{ address: 'localhost', family: 4 }]
    }),
    /non-IP DNS result/
  );
  await assert.rejects(
    resolveSafeRemoteUrl('https://example.com', {
      lookup: async () => [{ address: '203.0.113.8', family: 6 }]
    }),
    /inconsistent DNS family/
  );
});

test('safe research validates every redirect target and blocks private redirects', async () => {
  let fetchCalls = 0;
  await assert.rejects(
    fetchPage('https://example.test/source', {
      safeRemote: true,
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      fetch: async () => {
        fetchCalls += 1;
        return {
          status: 302,
          ok: false,
          url: 'https://example.test/source',
          headers: { get: (name) => name === 'location' ? 'http://127.0.0.1/admin' : null },
          text: async () => ''
        };
      }
    }),
    /private remote address/i
  );
  assert.equal(fetchCalls, 1);
});

test('safe research permits a bounded public response', async () => {
  const page = await fetchPage('https://example.test/source', {
    safeRemote: true,
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    fetch: async () => ({
      status: 200,
      ok: true,
      url: 'https://example.test/source',
      headers: { get: (name) => name === 'content-type' ? 'text/html' : null },
      text: async () => '<main>public evidence</main>'
    })
  });

  assert.equal(page.ok, true);
  assert.match(page.html, /public evidence/);
});

test('safe research pins fetch to the address set validated by the first DNS lookup', async () => {
  let lookups = 0;
  const dispatcher = { close: async () => {} };
  const page = await fetchPage('https://example.test/source', {
    safeRemote: true,
    lookup: async () => {
      lookups += 1;
      return [{ address: '93.184.216.34', family: 4 }];
    },
    dispatcherFactory: async (resolution) => {
      assert.deepEqual(resolution.addresses, [{ address: '93.184.216.34', family: 4 }]);
      return dispatcher;
    },
    fetch: async (_url, options) => {
      assert.equal(options.dispatcher, dispatcher);
      return {
        status: 200,
        ok: true,
        url: 'https://example.test/source',
        headers: { get: () => null },
        text: async () => 'pinned'
      };
    }
  });

  assert.equal(page.html, 'pinned');
  assert.equal(lookups, 1);
});

test('safe research stops reading a streaming response at the hard byte budget', async () => {
  const encoder = new TextEncoder();
  const page = await fetchPage('https://example.test/source', {
    safeRemote: true,
    maxHtmlChars: 10,
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    dispatcherFactory: async () => ({ close: async () => {} }),
    fetch: async () => ({
      status: 200,
      ok: true,
      url: 'https://example.test/source',
      headers: { get: () => null },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('12345678'));
          controller.enqueue(encoder.encode('abcdefgh'));
          controller.close();
        }
      })
    })
  });

  assert.equal(page.html, '12345678ab');
  assert.equal(page.bytes, 10);
  assert.equal(page.truncated, true);
});
