// Local test fixture only; the application uses the user's MockAPI in production.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

export async function startTestServers() {
  const resources = { BIT240094_DishCategory: [], BIT240094_Dish: [] };
  let serial = 0;
  const api = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    const [resource, id] = new URL(request.url, 'http://localhost').pathname
      .split('/')
      .filter(Boolean);
    const data = resources[resource];
    if (!data) {
      response.writeHead(404).end(JSON.stringify({ error: 'Missing resource' }));
      return;
    }
    if (request.method === 'GET') {
      response.end(JSON.stringify(id ? data.find((row) => row.id === id) : data));
      return;
    }
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 1000000) {
        response.writeHead(413).end();
        return;
      }
    }
    try {
      if (request.method === 'POST') {
        const row = { ...JSON.parse(body), id: String(++serial) };
        data.push(row);
        response.writeHead(201).end(JSON.stringify(row));
      } else {
        const index = data.findIndex((row) => row.id === id);
        if (index < 0) {
          response.writeHead(404).end('{}');
          return;
        }
        if (request.method === 'DELETE') {
          const [deleted] = data.splice(index, 1);
          response.end(JSON.stringify(deleted));
        } else if (request.method === 'PUT') {
          data[index] = { ...JSON.parse(body), id };
          response.end(JSON.stringify(data[index]));
        } else response.writeHead(405).end('{}');
      }
    } catch {
      response.writeHead(400).end('{}');
    }
  });
  const directory = resolve('dist');
  const mime = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff2': 'font/woff2',
  };
  const web = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = resolve(directory, `.${pathname}`);
    if (filePath !== directory && !filePath.startsWith(directory + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const actual = pathname === '/' ? resolve(directory, 'index.html') : filePath;
      const body = await readFile(actual);
      response.setHeader('Content-Type', mime[extname(actual)] ?? 'application/octet-stream');
      response.end(body);
    } catch {
      if (extname(pathname)) response.writeHead(404).end();
      else {
        response.setHeader('Content-Type', 'text/html');
        response.end(await readFile(resolve(directory, 'index.html')));
      }
    }
  });
  await Promise.all([
    new Promise((done) => api.listen(4174, '127.0.0.1', done)),
    new Promise((done) => web.listen(4173, '127.0.0.1', done)),
  ]);
  return {
    resources,
    close: async () => {
      api.closeAllConnections();
      web.closeAllConnections();
      await Promise.all([
        new Promise((done) => api.close(done)),
        new Promise((done) => web.close(done)),
      ]);
    },
  };
}
