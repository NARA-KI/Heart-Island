import http from 'node:http';
import { pathToFileURL } from 'node:url';

const SERVICE_NAME = 'heart-island-ai-report';
const DEFAULT_PORT = 9000;
const DEFAULT_API_PATH = '/api/v2/ai-report';

const { handleAiReportRequest } = await loadAiReportHandler();

export function createServer() {
  return http.createServer((request, response) => {
    routeRequest(request, response);
  });
}

export function routeRequest(request, response) {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, { ok: true, service: SERVICE_NAME });
    return;
  }

  if (isAiReportPath(url.pathname, request.method)) {
    return handleAiReportRequest(request, response);
  }

  if (url.pathname === '/' && !['POST', 'OPTIONS'].includes(request.method)) {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 404, { error: 'Not found' });
}

function isAiReportPath(pathname, method) {
  const configuredPath = process.env.AI_REPORT_API_PATH || DEFAULT_API_PATH;
  return pathname === DEFAULT_API_PATH
    || pathname === configuredPath
    || (pathname === '/' && ['POST', 'OPTIONS'].includes(method));
}

function writeJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
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
