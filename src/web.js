'use strict';

const dns = require('node:dns/promises');
const net = require('node:net');

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_HTML_CHARS = 500000;
const ABSOLUTE_MAX_HTML_BYTES = 2000000;
const DEFAULT_USER_AGENT = 'AIOSON-Web/1.0 (+https://aioson.dev)';

function ensureValidUrl(input) {
  try {
    return new URL(String(input || '').trim());
  } catch {
    throw new Error(`Invalid URL: ${input || ''}`);
  }
}

function normalizeIpLiteral(address) {
  return String(address || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/%[^%]+$/, '');
}

function parseIpv4(address) {
  const normalized = normalizeIpLiteral(address);
  if (net.isIP(normalized) !== 4) return null;
  return normalized.split('.').map(Number);
}

function ipv4InRange(octets, base, bits) {
  const value = (
    ((octets[0] << 24) >>> 0)
    + (octets[1] << 16)
    + (octets[2] << 8)
    + octets[3]
  ) >>> 0;
  const target = (
    ((base[0] << 24) >>> 0)
    + (base[1] << 16)
    + (base[2] << 8)
    + base[3]
  ) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (target & mask);
}

function isNonPublicIpv4(octets) {
  const ranges = [
    [[0, 0, 0, 0], 8],
    [[10, 0, 0, 0], 8],
    [[100, 64, 0, 0], 10],
    [[127, 0, 0, 0], 8],
    [[169, 254, 0, 0], 16],
    [[172, 16, 0, 0], 12],
    [[192, 0, 0, 0], 24],
    [[192, 0, 2, 0], 24],
    [[192, 88, 99, 0], 24],
    [[192, 168, 0, 0], 16],
    [[198, 18, 0, 0], 15],
    [[198, 51, 100, 0], 24],
    [[203, 0, 113, 0], 24],
    [[224, 0, 0, 0], 4],
    [[240, 0, 0, 0], 4]
  ];
  return ranges.some(([base, bits]) => ipv4InRange(octets, base, bits));
}

function parseIpv6(address) {
  let normalized = normalizeIpLiteral(address);
  if (net.isIP(normalized) !== 6) return null;
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':');
    const ipv4 = parseIpv4(normalized.slice(lastColon + 1));
    if (!ipv4) return null;
    normalized = `${normalized.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || halves.length === 1 && missing !== 0) return null;
  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right
  ].map((group) => Number.parseInt(group || '0', 16));
  if (groups.length !== 8 || groups.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) {
    return null;
  }
  return groups.flatMap((group) => [group >> 8, group & 0xff]);
}

function ipv6InRange(bytes, prefix, bits) {
  const fullBytes = Math.floor(bits / 8);
  const remaining = bits % 8;
  for (let index = 0; index < fullBytes; index++) {
    if (bytes[index] !== prefix[index]) return false;
  }
  if (remaining === 0) return true;
  const mask = (0xff << (8 - remaining)) & 0xff;
  return (bytes[fullBytes] & mask) === (prefix[fullBytes] & mask);
}

function isPrivateIpAddress(address) {
  const normalized = normalizeIpLiteral(address);
  const ipv4 = parseIpv4(normalized);
  if (ipv4) return isNonPublicIpv4(ipv4);
  const ipv6 = parseIpv6(normalized);
  if (!ipv6) return false;

  const mappedIpv4 = ipv6.slice(0, 10).every((byte) => byte === 0)
    && ipv6[10] === 0xff
    && ipv6[11] === 0xff;
  const compatibleIpv4 = ipv6.slice(0, 12).every((byte) => byte === 0);
  if (mappedIpv4 || compatibleIpv4) {
    return isNonPublicIpv4(ipv6.slice(12));
  }

  const blocked = [
    [[0x01, 0x00, 0, 0, 0, 0, 0, 0], 64],
    [[0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0], 96],
    [[0xfc, 0, 0, 0, 0, 0, 0, 0], 7],
    [[0xfe, 0x80, 0, 0, 0, 0, 0, 0], 10],
    [[0xff, 0, 0, 0, 0, 0, 0, 0], 8],
    [[0x20, 0x01, 0, 0, 0, 0, 0, 0], 32],
    [[0x20, 0x01, 0x00, 0x02, 0, 0, 0, 0], 48],
    [[0x20, 0x01, 0x00, 0x10, 0, 0, 0, 0], 28],
    [[0x20, 0x01, 0x00, 0x20, 0, 0, 0, 0], 28],
    [[0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0], 32],
    [[0x20, 0x02, 0, 0, 0, 0, 0, 0], 16],
    [[0x3f, 0xff, 0, 0, 0, 0, 0, 0], 20]
  ];
  return blocked.some(([prefix, bits]) => ipv6InRange(ipv6, prefix, bits));
}

async function resolveSafeRemoteUrl(input, options = {}) {
  const url = ensureValidUrl(input);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsafe remote URL scheme: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('Remote URLs with embedded credentials are not allowed');
  }
  const hostname = normalizeIpLiteral(url.hostname).replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error(`Private remote host is not allowed: ${hostname}`);
  }
  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) throw new Error(`Private remote address is not allowed: ${hostname}`);
    return {
      url,
      hostname,
      addresses: [{ address: hostname, family: net.isIP(hostname) }]
    };
  }
  const lookup = options.lookup || dns.lookup;
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error(`Remote host did not resolve: ${hostname}`);
  }
  const normalizedAddresses = addresses.map((entry) => {
    const address = normalizeIpLiteral(entry?.address);
    const family = net.isIP(address);
    if (!family) throw new Error(`Remote host returned a non-IP DNS result: ${hostname}`);
    if (entry?.family && Number(entry.family) !== family) {
      throw new Error(`Remote host returned an inconsistent DNS family: ${hostname}`);
    }
    return { address, family };
  });
  if (normalizedAddresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error(`Remote host resolves to a private address: ${hostname}`);
  }
  return {
    url,
    hostname,
    addresses: normalizedAddresses
  };
}

async function assertSafeRemoteUrl(input, options = {}) {
  return (await resolveSafeRemoteUrl(input, options)).url;
}

function createPinnedDispatcher(resolution) {
  const { Agent } = require('undici');
  const addresses = resolution.addresses;
  let cursor = 0;
  return new Agent({
    connect: {
      lookup(_hostname, lookupOptions, callback) {
        const family = Number(lookupOptions?.family || 0);
        const eligible = family
          ? addresses.filter((entry) => entry.family === family)
          : addresses;
        if (eligible.length === 0) {
          const error = new Error(`Validated remote host has no IPv${family} address`);
          error.code = 'ENOTFOUND';
          callback(error);
          return;
        }
        if (lookupOptions?.all) {
          callback(null, eligible.map((entry) => ({ ...entry })));
          return;
        }
        const selected = eligible[cursor % eligible.length];
        cursor += 1;
        callback(null, selected.address, selected.family);
      }
    }
  });
}

async function closeDispatcher(dispatcher) {
  if (!dispatcher || typeof dispatcher.close !== 'function') return;
  await dispatcher.close().catch(() => {});
}

async function readResponseTextBounded(response, maxBytes) {
  const limit = Math.max(1, Math.min(Number(maxBytes) || DEFAULT_MAX_HTML_CHARS, ABSOLUTE_MAX_HTML_BYTES));
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    let truncated = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        const remaining = limit - total;
        if (chunk.length > remaining) {
          if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
          total = limit;
          truncated = true;
          await reader.cancel('response byte limit reached').catch(() => {});
          break;
        }
        chunks.push(chunk);
        total += chunk.length;
      }
    } finally {
      reader.releaseLock?.();
    }
    return {
      text: Buffer.concat(chunks, total).toString('utf8'),
      truncated,
      bytes: total
    };
  }
  const text = await response.text();
  const buffer = Buffer.from(text, 'utf8');
  return {
    text: buffer.subarray(0, limit).toString('utf8'),
    truncated: buffer.length > limit,
    bytes: Math.min(buffer.length, limit)
  };
}

function normalizeUrl(input) {
  const url = input instanceof URL ? new URL(input.toString()) : ensureValidUrl(input);
  url.hash = '';
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  const normalized = url.toString();
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '').replace(/<[^>]+>/g, ' '));
}

function cleanWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ \u00A0]+\n/g, '\n')
    .replace(/\n[ \u00A0]+/g, '\n')
    .replace(/[ \u00A0]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTagContent(html, tagName) {
  const match = String(html || '').match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1] : '';
}

function extractTitle(html) {
  return cleanWhitespace(stripTags(extractTagContent(html, 'title')));
}

function extractMetaContent(html, name) {
  const match = String(html || '').match(new RegExp(`<meta[^>]+(?:name|property)=['\"]${name}['\"][^>]+content=['\"]([^'\"]+)['\"][^>]*>`, 'i'));
  return match ? decodeHtmlEntities(match[1]).trim() : '';
}

function extractCanonical(html) {
  const match = String(html || '').match(/<link[^>]+rel=['\"]canonical['\"][^>]+href=['\"]([^'\"]+)['\"][^>]*>/i);
  return match ? match[1].trim() : '';
}

function extractMainHtml(html) {
  const source = String(html || '');
  const patterns = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div\b[^>]*role=['\"]main['\"][^>]*>([\s\S]*?)<\/div>/i,
    /<body\b[^>]*>([\s\S]*?)<\/body>/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && match[1]) return match[1];
  }
  return source;
}

function htmlToMarkdown(html) {
  let output = String(html || '');
  output = output.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  output = output.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  output = output.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  output = output.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');
  output = output.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n');
  output = output.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n');
  output = output.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n');
  output = output.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n');
  output = output.replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n\n');
  output = output.replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n\n');
  output = output.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  output = output.replace(/<(p|div|section|article|main|header|footer|aside|blockquote)\b[^>]*>/gi, '\n');
  output = output.replace(/<\/(p|div|section|article|main|header|footer|aside|blockquote)>/gi, '\n');
  output = output.replace(/<br\s*\/?>/gi, '\n');
  output = output.replace(/<a\b[^>]*href=['\"]([^'\"]+)['\"][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');
  output = stripTags(output);
  return cleanWhitespace(output);
}

function htmlToText(html) {
  return cleanWhitespace(stripTags(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|main|header|footer|aside|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')));
}

function resolveHref(href, pageUrl) {
  const value = String(href || '').trim();
  if (!value || value.startsWith('#') || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('javascript:')) {
    return '';
  }

  try {
    return normalizeUrl(new URL(value, pageUrl));
  } catch {
    return '';
  }
}

function extractLinks(html, pageUrl, options = {}) {
  const sameOriginOnly = options.sameOriginOnly !== false;
  const base = ensureValidUrl(pageUrl);
  const links = new Set();
  const pattern = /<a\b[^>]*href=['\"]([^'\"]+)['\"][^>]*>/gi;
  let match;

  while ((match = pattern.exec(String(html || ''))) !== null) {
    const normalized = resolveHref(match[1], base);
    if (!normalized) continue;
    if (sameOriginOnly) {
      try {
        if (new URL(normalized).origin !== base.origin) continue;
      } catch {
        continue;
      }
    }
    links.add(normalized);
  }

  return Array.from(links).sort();
}

async function fetchPage(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const maxHtmlBytes = Math.min(
    Number(options.maxHtmlChars) > 0 ? Number(options.maxHtmlChars) : DEFAULT_MAX_HTML_CHARS,
    ABSOLUTE_MAX_HTML_BYTES
  );
  const headers = {
    'user-agent': options.userAgent || DEFAULT_USER_AGENT,
    'accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    ...(options.headers || {})
  };

  const fetchImpl = options.fetch || globalThis.fetch;
  const safeRemote = options.safeRemote === true;
  const maxRedirects = Math.min(Math.max(Number(options.maxRedirects || 5), 0), 10);
  let currentUrl = String(url);
  let response;
  let responseDispatcher = null;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    let dispatcher = null;
    if (safeRemote) {
      const resolution = await resolveSafeRemoteUrl(currentUrl, { lookup: options.lookup });
      dispatcher = typeof options.dispatcherFactory === 'function'
        ? await options.dispatcherFactory(resolution)
        : createPinnedDispatcher(resolution);
    }
    try {
      response = await fetchImpl(currentUrl, {
        method: 'GET',
        headers,
        redirect: safeRemote ? 'manual' : 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        ...(dispatcher ? { dispatcher } : {})
      });
    } catch (error) {
      await closeDispatcher(dispatcher);
      throw error;
    }
    responseDispatcher = dispatcher;
    if (!safeRemote || response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    if (!location) break;
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel().catch(() => {});
    }
    await closeDispatcher(responseDispatcher);
    responseDispatcher = null;
    if (redirectCount === maxRedirects) throw new Error(`Too many redirects for ${url}`);
    currentUrl = new URL(location, currentUrl).toString();
  }

  const finalUrl = normalizeUrl(response.url || currentUrl);
  const contentType = response.headers.get('content-type') || '';
  let bounded;
  try {
    bounded = await readResponseTextBounded(response, maxHtmlBytes);
  } finally {
    await closeDispatcher(responseDispatcher);
  }

  return {
    ok: response.ok,
    url: finalUrl,
    statusCode: response.status,
    contentType,
    html: bounded.text,
    truncated: bounded.truncated,
    bytes: bounded.bytes
  };
}

async function scrapePage(url, options = {}) {
  const page = await fetchPage(url, options);
  const mainHtml = extractMainHtml(page.html);
  const title = extractTitle(page.html);
  const description = extractMetaContent(page.html, 'description') || extractMetaContent(page.html, 'og:description');
  const canonical = extractCanonical(page.html);
  const links = extractLinks(page.html, page.url, { sameOriginOnly: options.sameOriginOnly !== false });
  const text = htmlToText(mainHtml);
  const markdown = htmlToMarkdown(mainHtml);

  return {
    ok: page.ok,
    url: page.url,
    statusCode: page.statusCode,
    contentType: page.contentType,
    title,
    description,
    canonical,
    html: mainHtml,
    text,
    markdown,
    links,
    truncated: page.truncated
  };
}

async function mapWebsite(url, options = {}) {
  const startUrl = normalizeUrl(url);
  const start = ensureValidUrl(startUrl);
  const maxDepth = Number(options.maxDepth) >= 0 ? Number(options.maxDepth) : 2;
  const maxPages = Number(options.maxPages) > 0 ? Number(options.maxPages) : 25;
  const sameOriginOnly = options.sameOriginOnly !== false;

  const queue = [{ url: startUrl, depth: 0 }];
  const visited = new Set();
  const pages = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift();
    if (!current || visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const page = await scrapePage(current.url, options);
      const sameOriginLinks = extractLinks(page.html || '', page.url, { sameOriginOnly });
      pages.push({
        url: page.url,
        depth: current.depth,
        statusCode: page.statusCode,
        title: page.title,
        description: page.description,
        linkCount: sameOriginLinks.length
      });

      if (current.depth >= maxDepth) continue;
      for (const link of sameOriginLinks) {
        if (visited.has(link)) continue;
        if (sameOriginOnly) {
          try {
            if (new URL(link).origin != start.origin) continue;
          } catch {
            continue;
          }
        }
        queue.push({ url: link, depth: current.depth + 1 });
      }
    } catch (error) {
      pages.push({
        url: current.url,
        depth: current.depth,
        statusCode: 0,
        title: '',
        description: '',
        linkCount: 0,
        error: error.message
      });
    }
  }

  return {
    startUrl,
    maxDepth,
    maxPages,
    pageCount: pages.length,
    urls: pages.map((item) => item.url),
    pages
  };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_HTML_CHARS,
  ABSOLUTE_MAX_HTML_BYTES,
  DEFAULT_USER_AGENT,
  normalizeUrl,
  extractLinks,
  htmlToMarkdown,
  htmlToText,
  fetchPage,
  scrapePage,
  mapWebsite,
  isPrivateIpAddress,
  resolveSafeRemoteUrl,
  assertSafeRemoteUrl,
  createPinnedDispatcher,
  readResponseTextBounded
};
