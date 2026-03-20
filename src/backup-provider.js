'use strict';

const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

// ── S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Backblaze B2) ──

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(secretKey, dateStamp, region, service) {
  let key = hmacSha256(`AWS4${secretKey}`, dateStamp);
  key = hmacSha256(key, region);
  key = hmacSha256(key, service);
  key = hmacSha256(key, 'aws4_request');
  return key;
}

function signV4(method, url, headers, body, config) {
  const { accessKeyId, secretAccessKey, region } = config;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = sha256Hex(body || '');
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = payloadHash;

  const sortedHeaders = Object.keys(headers).sort();
  const signedHeaders = sortedHeaders.map(k => k.toLowerCase()).join(';');
  const canonicalHeaders = sortedHeaders
    .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join('\n') + '\n';

  const parsed = new URL(url);
  const canonicalQuery = parsed.searchParams.toString();
  const canonicalRequest = [
    method,
    parsed.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  headers['authorization'] =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

function s3Request(method, url, body, config) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = {
      'host': parsed.host,
      'content-type': 'application/octet-stream'
    };

    if (body) {
      headers['content-length'] = String(Buffer.byteLength(body));
    }

    signV4(method, url, headers, body || '', config);

    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('S3 request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

function buildS3Url(config, key) {
  const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
  const base = endpoint.replace(/\/+$/, '');
  const prefix = config.prefix ? config.prefix.replace(/\/+$/, '') + '/' : '';
  return `${base}/${config.bucket}/${prefix}${key}`;
}

class S3Provider {
  constructor(config) {
    this.config = config;
    if (!config.bucket) throw new Error('S3 provider requires "bucket"');
    if (!config.accessKeyId) throw new Error('S3 provider requires "accessKeyId"');
    if (!config.secretAccessKey) throw new Error('S3 provider requires "secretAccessKey"');
    if (!config.region) this.config.region = 'us-east-1';
  }

  async upload(key, buffer, contentType = 'application/octet-stream') {
    const url = buildS3Url(this.config, key);
    const res = await s3Request('PUT', url, buffer, this.config);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 PUT failed (${res.statusCode}): ${res.body.toString().slice(0, 200)}`);
    }
    return { ok: true, key, etag: res.headers.etag || null };
  }

  async download(key) {
    const url = buildS3Url(this.config, key);
    const res = await s3Request('GET', url, null, this.config);
    if (res.statusCode === 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 GET failed (${res.statusCode}): ${res.body.toString().slice(0, 200)}`);
    }
    return res.body;
  }

  async exists(key) {
    const url = buildS3Url(this.config, key);
    const res = await s3Request('HEAD', url, null, this.config);
    return res.statusCode === 200;
  }

  async list(prefix) {
    const fullPrefix = this.config.prefix
      ? `${this.config.prefix.replace(/\/+$/, '')}/${prefix}`
      : prefix;

    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`;
    const base = endpoint.replace(/\/+$/, '');
    const url = `${base}/${this.config.bucket}?list-type=2&prefix=${encodeURIComponent(fullPrefix)}&max-keys=1000`;
    const res = await s3Request('GET', url, null, this.config);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 LIST failed (${res.statusCode})`);
    }

    // Simple XML parse for Key elements
    const xml = res.body.toString();
    const items = [];
    const keyRegex = /<Key>([^<]+)<\/Key>/g;
    let match;
    while ((match = keyRegex.exec(xml)) !== null) {
      const itemKey = match[1];
      // Strip provider prefix to return relative keys
      const relKey = this.config.prefix
        ? itemKey.replace(new RegExp(`^${this.config.prefix.replace(/\/+$/, '')}/`), '')
        : itemKey;
      items.push({ key: relKey });
    }
    return items;
  }
}

// ── Custom HTTP provider ──

function httpFetch(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = {
      'content-type': 'application/octet-stream'
    };
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['content-length'] = String(Buffer.byteLength(body));
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('HTTP request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

class HttpProvider {
  constructor(config) {
    this.endpoint = (config.endpoint || '').replace(/\/+$/, '');
    this.token = config.token || config.httpToken || null;
    this.prefix = config.prefix ? config.prefix.replace(/\/+$/, '') + '/' : '';
    if (!this.endpoint) throw new Error('HTTP provider requires "endpoint"');
  }

  _url(key) {
    return `${this.endpoint}/${this.prefix}${key}`;
  }

  async upload(key, buffer, contentType = 'application/octet-stream') {
    const res = await httpFetch('PUT', this._url(key), buffer, this.token);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`HTTP PUT failed (${res.statusCode}): ${res.body.toString().slice(0, 200)}`);
    }
    return { ok: true, key };
  }

  async download(key) {
    const res = await httpFetch('GET', this._url(key), null, this.token);
    if (res.statusCode === 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`HTTP GET failed (${res.statusCode})`);
    }
    return res.body;
  }

  async exists(key) {
    const res = await httpFetch('HEAD', this._url(key), null, this.token);
    return res.statusCode === 200;
  }

  async list(prefix) {
    const res = await httpFetch('GET', `${this._url(prefix)}?list=true`, null, this.token);
    if (res.statusCode < 200 || res.statusCode >= 300) return [];
    try {
      return JSON.parse(res.body.toString());
    } catch {
      return [];
    }
  }
}

// ── Factory ──

function createProvider(config) {
  if (!config || !config.provider) {
    throw new Error('Backup config missing "provider" field. Expected "s3" or "http".');
  }
  switch (config.provider) {
    case 's3':
      return new S3Provider(config);
    case 'http':
      return new HttpProvider(config);
    default:
      throw new Error(`Unknown backup provider: "${config.provider}". Use "s3" or "http".`);
  }
}

function contentHash(data) {
  return sha256Hex(typeof data === 'string' ? data : JSON.stringify(data));
}

module.exports = {
  createProvider,
  S3Provider,
  HttpProvider,
  contentHash,
  sha256Hex
};
