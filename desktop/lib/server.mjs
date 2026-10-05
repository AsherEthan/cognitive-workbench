import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp' };
const DISABLED_MODULES = ['telos', 'work', 'content', 'health', 'finances', 'business', 'growth', 'local', 'gear', 'books', 'atlas', 'memory', 'synapse', 'da', 'bunker', 'algorithm', 'conduit', 'upgrades', 'ledger', 'performance', 'usage', 'docs'];

function cookieMatches(value, token) {
  const candidate = (value || '').split(';').map(p => p.trim()).find(p => p.startsWith('cw_session='))?.slice(11) || '';
  const a = Buffer.from(candidate), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req) {
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new Error('請以 JSON 格式提交。');
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 150_000) throw new Error('輸入過長。');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const value = JSON.parse(raw || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('輸入格式不正確。');
  return { raw, value };
}

export async function startWorkbenchServer({ frontendDir, manager, awarenessHandler, port = 0 }) {
  const token = randomBytes(32).toString('hex');
  const peers = new Set();
  const history = [];
  let sequence = 0;
  let origin = '';
  const send = (res, type, value, id) => res.write((id ? 'id: ' + id + '\n' : '') + 'event: ' + type + '\ndata: ' + JSON.stringify(value) + '\n\n');
  const broadcast = (type, value) => {
    const entry = { type, value, id: ++sequence };
    history.push(entry); if (history.length > 256) history.shift();
    for (const peer of peers) send(peer, type, value, entry.id);
  };
  const listeners = ['status', 'hermes', 'approval', 'clarification'].map(type => {
    const handler = value => broadcast(type, value);
    manager.on(type, handler); return [type, handler];
  });

  const server = createServer(async (req, res) => {
    const json = (value, status = 200) => {
      if (res.headersSent) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    try {
      if (req.headers.host !== new URL(origin).host) return json({ error: 'Host 不符合目前的工作台。' }, 403);
      if (!cookieMatches(req.headers.cookie, token)) return json({ error: '請從桌面 App 開啟工作台。' }, 401);
      if (req.headers['sec-fetch-site'] === 'cross-site') return json({ error: '不接受跨網站請求。' }, 403);
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) return json({ error: '請從目前工作台執行操作。' }, 403);
      const url = new URL(req.url, origin);
      const pathname = url.pathname;

      if (pathname === '/api/desktop/capabilities' && req.method === 'GET') return json({ desktop: true, pages: ['/awareness', '/practices', '/agent'] });
      if (pathname === '/api/config/modules' && req.method === 'GET') return json({ modules: Object.fromEntries(DISABLED_MODULES.map(name => [name, false])) });
      if (pathname === '/api/hermes/status' && req.method === 'GET') return json(manager.status());
      if (pathname === '/api/hermes/settings' && req.method === 'GET') return json(manager.settings);

      if (pathname === '/api/hermes/events' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(': connected\n\n'); peers.add(res);
        send(res, 'status', manager.status());
        const last = Number(req.headers['last-event-id'] || 0);
        if (last > 0) for (const entry of history) if (entry.id > last) send(res, entry.type, entry.value, entry.id);
        for (const request of manager.pending.values()) send(res, request.method === 'approval' ? 'approval' : 'clarification', request);
        const timer = setInterval(() => res.write(': keepalive\n\n'), 15_000);
        timer.unref?.();
        res.on('close', () => { clearInterval(timer); peers.delete(res); });
        return;
      }

      if (pathname === '/api/self-awareness' || pathname.startsWith('/api/self-awareness/')) {
        let raw;
        if (['POST', 'PATCH'].includes(req.method)) raw = (await readBody(req)).raw;
        const headers = new Headers();
        for (const [name, value] of Object.entries(req.headers)) if (typeof value === 'string' && name !== 'content-length') headers.set(name, value);
        const request = new Request(origin + pathname, { method: req.method, headers, ...(raw === undefined ? {} : { body: raw }) });
        const response = await awarenessHandler(request, pathname);
        if (!response) return json({ error: '找不到功能。' }, 404);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer())); return;
      }

      if (pathname.startsWith('/api/hermes/') && req.method === 'POST') {
        const { value } = await readBody(req);
        if (pathname === '/api/hermes/start') return json(await manager.start());
        if (pathname === '/api/hermes/stop') return json(await manager.stop());
        if (pathname === '/api/hermes/settings') return json(await manager.saveSettings(value));
        if (pathname === '/api/hermes/rpc') return json({ result: await manager.request(value.method, value.params) });
        if (pathname === '/api/hermes/approval') return json(manager.reply(value.id, 'approval', { choice: value.choice }));
        if (pathname === '/api/hermes/clarification') return json(manager.reply(value.id, 'clarify', { answers: value.answers }));
      }
      if (pathname.startsWith('/api/')) return json({ error: '此功能不在桌面首版的範圍內。' }, 404);
      if (!['GET', 'HEAD'].includes(req.method)) return json({ error: '不支援此操作。' }, 405);

      const base = realpathSync(frontendDir);
      const decoded = decodeURIComponent(pathname === '/' ? '/agent' : pathname);
      if (decoded.includes('\0')) return json({ error: '無效路徑。' }, 400);
      const candidate = resolve(base, '.' + decoded);
      const inside = path => { const rel = relative(base, path); return rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith(sep); };
      if (!inside(candidate)) return json({ error: '無效路徑。' }, 403);
      const file = [candidate, candidate + '.html', resolve(candidate, 'index.html')].find(path => existsSync(path) && statSync(path).isFile());
      if (!file || !inside(realpathSync(file))) return json({ error: '找不到頁面。' }, 404);
      const type = extname(file);
      let content = readFileSync(file);
      const nonce = randomBytes(18).toString('base64');
      if (type === '.html') content = Buffer.from(content.toString('utf8').replace(/<script(?=[\s>])/g, '<script nonce="' + nonce + '"'));
      res.writeHead(200, {
        'Content-Type': TYPES[type] || 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-" + nonce + "'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      json({ error: error instanceof SyntaxError ? '輸入格式不正確。' : error.message || '操作未完成。', ...(typeof error.code === 'string' ? { code: error.code } : {}) }, 400);
    }
  });
  await new Promise((ready, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { origin = 'http://127.0.0.1:' + server.address().port; ready(); });
  });
  return {
    origin, token,
    async close() {
      for (const [name, handler] of listeners) manager.off(name, handler);
      for (const peer of peers) peer.end(); peers.clear();
      await new Promise(resolveClose => server.close(resolveClose));
    },
  };
}
