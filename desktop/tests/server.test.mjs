import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startWorkbenchServer } from '../lib/server.mjs';

class FakeManager extends EventEmitter {
  constructor() {
    super();
    this.state = 'stopped';
    this.settings = { executable: '/fake/hermes' };
    this.pending = new Map();
    this.calls = [];
  }
  status() { return { state: this.state, active: false }; }
  async start() { this.calls.push(['start']); this.state = 'ready'; return this.status(); }
  async stop() { this.calls.push(['stop']); this.state = 'stopped'; return this.status(); }
  async saveSettings(value) { this.calls.push(['settings', value]); return value; }
  async request(method, params) { this.calls.push(['rpc', method, params]); return { accepted: true }; }
  reply(id, method, result) { this.calls.push(['reply', id, method, result]); return { ok: true }; }
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cw-server-test-'));
  const frontendDir = join(root, 'frontend');
  await mkdir(join(frontendDir, 'nested'), { recursive: true });
  await mkdir(join(frontendDir, '_next', 'static'), { recursive: true });
  await writeFile(join(frontendDir, 'agent.html'), '<!doctype html><title>Agent</title><script>window.ready = true;</script>');
  await writeFile(join(frontendDir, 'awareness.html'), '<!doctype html><title>Awareness</title>');
  await writeFile(join(frontendDir, 'nested', 'index.html'), '<!doctype html><title>Nested</title>');
  await writeFile(join(frontendDir, '_next', 'static', 'app.js'), 'window.app = true;');
  const manager = new FakeManager();
  const awarenessCalls = [];
  const server = await startWorkbenchServer({
    frontendDir,
    manager,
    awarenessHandler: async (request, pathname) => {
      const body = await request.text();
      awarenessCalls.push({ method: request.method, pathname, body });
      return new Response(JSON.stringify({ handled: true }), {
        status: request.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json', 'X-Awareness-Test': 'yes' },
      });
    },
  });
  const streams = new Set();
  let closePromise;
  const close = () => closePromise ||= server.close();
  t.after(async () => {
    for (const stream of streams) stream.destroy();
    await close();
    await rm(root, { recursive: true, force: true });
  });

  function request(path, { method = 'GET', authenticated = true, origin = server.origin, headers = {}, body } = {}) {
    const data = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = httpRequest(server.origin, {
        method,
        path,
        agent: false,
        headers: {
          ...(authenticated ? { Cookie: 'cw_session=' + server.token } : {}),
          ...(origin === null ? {} : { Origin: origin }),
          ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
      }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, headers: res.headers, text, json: () => JSON.parse(text) });
        });
      });
      req.on('error', reject);
      req.end(data);
    });
  }

  async function openEvents(lastEventId) {
    return new Promise((resolve, reject) => {
      const req = httpRequest(server.origin, {
        path: '/api/hermes/events',
        agent: false,
        headers: { Cookie: 'cw_session=' + server.token, ...(lastEventId === undefined ? {} : { 'Last-Event-ID': String(lastEventId) }) },
      });
      req.on('error', reject);
      req.on('response', res => {
        const events = [];
        const waiters = new Set();
        let buffer = '';
        let ended = false;
        const endedPromise = new Promise(resolveEnd => res.once('end', () => { ended = true; resolveEnd(); }));
        res.on('data', chunk => {
          buffer += chunk.toString('utf8');
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const fields = block.split('\n');
            const data = fields.filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
            if (!data) continue;
            const event = {
              type: fields.find(line => line.startsWith('event: '))?.slice(7) || 'message',
              id: fields.find(line => line.startsWith('id: '))?.slice(4),
              value: JSON.parse(data),
            };
            events.push(event);
            for (const waiter of waiters) {
              if (waiter.predicate(event)) { clearTimeout(waiter.timer); waiters.delete(waiter); waiter.resolve(event); }
            }
          }
        });
        const stream = {
          response: res,
          events,
          get ended() { return ended; },
          endedPromise,
          waitFor(predicate) {
            const existing = events.find(predicate);
            if (existing) return Promise.resolve(existing);
            return new Promise((resolveEvent, rejectEvent) => {
              const waiter = { predicate, resolve: resolveEvent };
              waiter.timer = setTimeout(() => { waiters.delete(waiter); rejectEvent(new Error('Timed out waiting for SSE event')); }, 1500);
              waiters.add(waiter);
            });
          },
          destroy() { req.destroy(); res.destroy(); streams.delete(stream); },
        };
        streams.add(stream);
        resolve(stream);
      });
      req.end();
    });
  }

  return { root, frontendDir, manager, awarenessCalls, server, request, openEvents, close };
}

test('session cookie is required for API, SSE and static files; a URL token grants no access', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  for (const path of ['/api/hermes/status', '/api/hermes/events', '/agent', '/?token=' + f.server.token]) {
    const response = await f.request(path, { authenticated: false });
    assert.equal(response.status, 401, path);
    assert.ok(!response.text.includes(f.server.token));
  }
  for (const cookie of ['cw_session=wrong', 'cw_session_extra=' + f.server.token, 'other=' + f.server.token]) {
    assert.equal((await f.request('/api/hermes/status', { headers: { Cookie: cookie } })).status, 401);
  }
  const valid = await f.request('/api/hermes/status', { headers: { Cookie: 'unrelated=value; cw_session=' + f.server.token + '; next=ok' } });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.json(), { state: 'stopped', active: false });
  assert.deepEqual(f.manager.calls, []);
});

test('wrong hosts, cross-site reads and missing or foreign mutation origins fail before reaching the manager', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/hermes/status', { headers: { Host: 'attacker.example' } })).status, 403);
  assert.equal((await f.request('/api/hermes/status', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  for (const origin of [null, 'null', 'https://attacker.example', f.server.origin + '.attacker.example']) {
    for (const path of ['/api/hermes/start', '/api/hermes/approval', '/api/self-awareness']) {
      const response = await f.request(path, { method: 'POST', origin, body: { id: 'approval-1', choice: 'always' } });
      assert.equal(response.status, 403, path + ' origin=' + origin);
    }
  }
  assert.equal((await f.request('/api/hermes/start', { method: 'POST', body: {}, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.deepEqual(f.manager.calls, []);
  assert.deepEqual(f.awarenessCalls, []);
});

test('authorized desktop routes call the intended manager operations with their original identifiers', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  assert.deepEqual((await f.request('/api/desktop/capabilities')).json(), { desktop: true, pages: ['/awareness', '/practices', '/agent'] });
  assert.equal((await f.request('/api/config/modules')).json().modules.telos, false);
  assert.deepEqual((await f.request('/api/hermes/settings')).json(), f.manager.settings);
  assert.equal((await f.request('/api/hermes/start', { method: 'POST', body: {} })).json().state, 'ready');
  assert.equal((await f.request('/api/hermes/stop', { method: 'POST', body: {} })).json().state, 'stopped');
  await f.request('/api/hermes/settings', { method: 'POST', body: { executable: '/new/hermes' } });
  const rpc = await f.request('/api/hermes/rpc', { method: 'POST', body: { method: 'session.resume', params: { session_id: 'stored-session-1' } } });
  assert.deepEqual(rpc.json(), { result: { accepted: true } });
  await f.request('/api/hermes/approval', { method: 'POST', body: { id: 'outer-srq-7', choice: 'deny' } });
  await f.request('/api/hermes/clarification', { method: 'POST', body: { id: 'outer-srq-8', answers: { goal: 'Read my notes' } } });
  assert.deepEqual(f.manager.calls, [
    ['start'], ['stop'], ['settings', { executable: '/new/hermes' }],
    ['rpc', 'session.resume', { session_id: 'stored-session-1' }],
    ['reply', 'outer-srq-7', 'approval', { choice: 'deny' }],
    ['reply', 'outer-srq-8', 'clarify', { answers: { goal: 'Read my notes' } }],
  ]);
  assert.equal((await f.request('/api/hermes/unknown', { method: 'POST', body: {} })).status, 404);
  assert.equal((await f.request('/api/telos')).status, 404);
});

test('malformed or non-JSON mutation bodies never reach an operation; awareness preserves its body and response', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  for (const body of ['{broken', 'null', '[]', '42']) {
    assert.equal((await f.request('/api/hermes/start', { method: 'POST', body })).status, 400);
  }
  assert.equal((await f.request('/api/hermes/start', { method: 'POST', body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 400);
  assert.deepEqual(f.manager.calls, []);
  const raw = '{ "clarity": 2, "note": "今天的觀察" }';
  const created = await f.request('/api/self-awareness', { method: 'POST', body: raw });
  assert.equal(created.status, 201);
  assert.equal(created.headers['x-awareness-test'], 'yes');
  assert.deepEqual(created.json(), { handled: true });
  await f.request('/api/self-awareness/entry-1', { method: 'PATCH', body: { note: '修訂' } });
  await f.request('/api/self-awareness/entry-1', { method: 'DELETE' });
  assert.deepEqual(f.awarenessCalls, [
    { method: 'POST', pathname: '/api/self-awareness', body: raw },
    { method: 'PATCH', pathname: '/api/self-awareness/entry-1', body: '{"note":"修訂"}' },
    { method: 'DELETE', pathname: '/api/self-awareness/entry-1', body: '' },
  ]);
});

test('static routes resolve exported pages and enforce a nonce CSP without caching private HTML', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const home = await f.request('/');
  assert.equal(home.status, 302);
  assert.equal(home.headers.location, '/awareness');
  for (const path of ['/awareness', '/agent', '/agent.html', '/nested/']) {
    const response = await f.request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers['content-type'], /^text\/html/);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  }
  const html = await f.request('/agent');
  const nonce = html.headers['content-security-policy'].match(/'nonce-([^']+)'/)[1];
  assert.ok(html.text.includes('<script nonce="' + nonce + '">'));
  assert.ok(!html.text.includes(f.server.token));
  const asset = await f.request('/_next/static/app.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['cache-control'], /immutable/);
  assert.equal(asset.text, 'window.app = true;');
  assert.equal((await f.request('/agent', { method: 'HEAD' })).text, '');
  assert.equal((await f.request('/agent', { method: 'POST', body: {} })).status, 405);
});

test('encoded traversal and file or directory symlinks cannot expose files outside the static root', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const secret = 'outside-sensitive-content';
  await writeFile(join(f.root, 'outside-secret.txt'), secret);
  await mkdir(join(f.root, 'outside-dir'));
  await writeFile(join(f.root, 'outside-dir', 'index.html'), secret);
  await symlink(join(f.root, 'outside-secret.txt'), join(f.frontendDir, 'leak.txt'));
  await symlink(join(f.root, 'outside-dir'), join(f.frontendDir, 'linked-dir'));
  for (const path of [
    '/%2e%2e%2foutside-secret.txt', '/..%2foutside-secret.txt', '/%2f..%2foutside-secret.txt',
    '/%252e%252e%252foutside-secret.txt', '/leak.txt', '/linked-dir', '/linked-dir/index.html',
  ]) {
    const response = await f.request(path);
    assert.ok([403, 404].includes(response.status), path + ': ' + response.status);
    assert.ok(!response.text.includes(secret), path);
  }
  assert.equal((await f.request('/%00agent')).status, 400);
  assert.equal((await f.request('/%zz')).status, 400);
});

test('SSE delivers live events and replays only events newer than Last-Event-ID', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const first = await f.openEvents();
  assert.equal(first.response.statusCode, 200);
  assert.equal(first.response.headers['content-type'], 'text/event-stream');
  assert.deepEqual((await first.waitFor(event => event.type === 'status')).value, f.manager.status());
  f.manager.emit('hermes', { type: 'message.delta', session_id: 'r1', payload: { text: '第一段' } });
  const received = await first.waitFor(event => event.type === 'hermes');
  assert.ok(Number(received.id) > 0);
  first.destroy();
  f.manager.emit('hermes', { type: 'message.delta', session_id: 'r1', payload: { text: '第二段' } });
  f.manager.emit('hermes', { type: 'message.complete', session_id: 'r1' });
  const second = await f.openEvents(received.id);
  const replayed = await second.waitFor(event => event.value.type === 'message.delta');
  assert.equal(replayed.value.payload.text, '第二段');
  await second.waitFor(event => event.value.type === 'message.complete');
  assert.deepEqual(second.events.filter(event => event.type === 'hermes').map(event => Number(event.id)), [Number(received.id) + 1, Number(received.id) + 2]);
  assert.deepEqual(f.manager.calls, [], 'Reloading an event stream never resubmits an Agent task');
});

test('SSE reconnect restores pending approval and clarification cards without answering either request', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const approval = { id: 'outer-approval-1', method: 'approval', params: { request_id: 'inner-1', session_id: 'r1', command: 'write report', choices: ['once', 'deny'] } };
  const clarification = { id: 'outer-clarify-1', method: 'clarify', params: { session_id: 'r1', questions: [{ qid: 'goal', question: 'Which report?' }] } };
  f.manager.pending.set(approval.id, approval);
  f.manager.pending.set(clarification.id, clarification);
  for (const lastId of [undefined, 9999]) {
    const stream = await f.openEvents(lastId);
    assert.deepEqual((await stream.waitFor(event => event.type === 'approval')).value, approval);
    assert.deepEqual((await stream.waitFor(event => event.type === 'clarification')).value, clarification);
    stream.destroy();
  }
  assert.equal(f.manager.pending.size, 2);
  assert.deepEqual(f.manager.calls, [], 'Opening or restoring a card cannot grant an approval');
});

test('closing the HTTP server ends SSE streams and removes manager listeners', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const stream = await f.openEvents();
  await stream.waitFor(event => event.type === 'status');
  for (const name of ['status', 'hermes', 'approval', 'clarification']) assert.equal(f.manager.listenerCount(name), 1);
  await f.close();
  await stream.endedPromise;
  assert.equal(stream.ended, true);
  for (const name of ['status', 'hermes', 'approval', 'clarification']) assert.equal(f.manager.listenerCount(name), 0);
  f.manager.emit('hermes', { type: 'message.complete', session_id: 'r1' });
});
