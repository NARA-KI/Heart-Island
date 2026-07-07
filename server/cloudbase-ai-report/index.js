import http from 'node:http';
import { pathToFileURL } from 'node:url';

const SERVICE_NAME = 'heart-island-ai-report';
const DEFAULT_PORT = 9000;
const DEFAULT_API_PATH = '/api/v2/ai-report';
const ADAPTER_VERSION = 'gateway-cors-v1';
const GATEWAY_OWNED_CORS_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-max-age',
]);

const { handleAiReportRequest } = await loadAiReportHandler();

export function createServer() {
  return http.createServer((request, response) => {
    routeRequest(request, response).catch(() => {
      writeJson(response, 500, { error: 'AI report service unavailable' });
    });
  });
}

export async function routeRequest(request, response) {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, { ok: true, service: SERVICE_NAME });
    return;
  }

  if (isAiReportPath(url.pathname, request.method)) {
    return forwardAiReportRequest(request, response);
  }

  if (url.pathname === '/' && !['POST', 'OPTIONS'].includes(request.method)) {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 404, { error: 'Not found' });
}

async function forwardAiReportRequest(request, response) {
  const captured = new CapturedResponse();
  await handleAiReportRequest(request, captured);
  writeCapturedResponse(response, captured);
}

function isAiReportPath(pathname, method) {
  const configuredPath = process.env.AI_REPORT_API_PATH || DEFAULT_API_PATH;
  return pathname === DEFAULT_API_PATH
    || pathname === configuredPath
    || (pathname === '/' && ['POST', 'OPTIONS'].includes(method));
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Heart-Island-Adapter-Version': ADAPTER_VERSION,
  });
  response.end(JSON.stringify(body));
}

function writeCapturedResponse(response, captured) {
  const headers = sanitizeCloudBaseResponseHeaders(captured.finalHeaders());
  for (const { name, value } of headers.values()) {
    response.setHeader(name, value);
  }
  response.setHeader('X-Heart-Island-Adapter-Version', ADAPTER_VERSION);
  response.writeHead(captured.statusCode);
  response.end(captured.body());
}

export function sanitizeCloudBaseResponseHeaders(headers) {
  const safeHeaders = new Map();
  for (const [key, header] of headers.entries()) {
    if (GATEWAY_OWNED_CORS_HEADERS.has(key)) continue;
    if (key === 'vary') {
      const value = uniqueCommaTokens(header.value)
        .filter((token) => token.toLowerCase() !== 'origin')
        .join(', ');
      if (value) safeHeaders.set(key, { name: header.name, value });
      continue;
    }
    safeHeaders.set(key, header);
  }
  return safeHeaders;
}

class CapturedResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = new Map();
    this.chunks = [];
    this.headersSent = false;
    this.writableEnded = false;
  }

  setHeader(name, value) {
    const key = String(name).toLowerCase();
    this.headers.set(key, {
      name: canonicalHeaderName(name),
      value: normalizeHeaderValue(key, value),
    });
    return this;
  }

  getHeader(name) {
    return this.headers.get(String(name).toLowerCase())?.value;
  }

  removeHeader(name) {
    this.headers.delete(String(name).toLowerCase());
  }

  writeHead(status, headers = undefined) {
    this.statusCode = Number(status) || this.statusCode;
    if (headers && typeof headers === 'object') {
      for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    }
    this.headersSent = true;
    return this;
  }

  write(chunk) {
    if (chunk !== undefined) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return true;
  }

  end(chunk) {
    if (chunk !== undefined) this.write(chunk);
    this.writableEnded = true;
    return this;
  }

  finalHeaders() {
    return new Map(this.headers);
  }

  body() {
    return Buffer.concat(this.chunks);
  }
}

function normalizeHeaderValue(key, value) {
  const raw = Array.isArray(value) ? lastHeaderValue(value) : value;
  const text = String(raw ?? '');
  if (key === 'vary') return uniqueCommaTokens(text).join(', ');
  if (key === 'access-control-allow-origin') return uniqueCommaTokens(text)[0] ?? '';
  return text;
}

function lastHeaderValue(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== undefined && values[index] !== null) return values[index];
  }
  return '';
}

function uniqueCommaTokens(value) {
  const seen = new Set();
  const tokens = [];
  for (const token of String(value).split(',').map((item) => item.trim()).filter(Boolean)) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }
  return tokens;
}

function canonicalHeaderName(name) {
  return String(name)
    .toLowerCase()
    .split('-')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join('-');
}

async function loadAiReportHandler() {
  try {
    return await import('./server/ai-report/handler.js');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !String(error?.url || '').endsWith('/server/ai-report/handler.js')) {
      throw error;
    }
    return import('../ai-report/handler.js');
  }
}

if (isDirectRun()) {
  const server = createServer();
  const port = Number(process.env.PORT || DEFAULT_PORT);
  server.listen(port, '0.0.0.0', () => {
    console.log(`${SERVICE_NAME} listening on ${port}`);
  });
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
