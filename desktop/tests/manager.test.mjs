import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate as nextTurn } from 'node:timers/promises';
import test from 'node:test';
import { HermesManager, resolveExecutable } from '../lib/hermes-manager.mjs';

// All processes and gateways are fakes. The executable only exercises local
// path validation: these tests never run Hermes or contact a model provider.
class FakeChild extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.exitCode = null;
    this.signalCode = null;
    this.exited = false;
    this.autoExitOnKill = true;
    this.killSignals = [];
  }
  kill(signal) {
    this.killSignals.push(signal);
    if (this.autoExitOnKill && !this.exited) queueMicrotask(() => this.exit(null, signal));
    return !this.exited;
  }
  exit(code = 0, signal = null) {
    if (this.exited) return;
    this.exited = true;
    this.exitCode = code;
    this.signalCode = signal;
    this.emit('exit', code, signal);
  }
  ready(port = 19201) {
    this.stdout.emit('data', Buffer.from(`HERMES_BACKEND_READY port=${port}\n`));
  }
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture(t, { autoReady = true, connect, request, startupTimeoutMs = 500 } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cw-manager-test-'));
  const executable = join(root, 'hermes fixture');
  writeFileSync(executable, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  chmodSync(executable, 0o700);
  const settingsPath = join(root, 'settings', 'desktop.json');
  mkdirSync(join(root, 'settings'), { mode: 0o700 });
  writeFileSync(settingsPath, JSON.stringify({ executable }), { mode: 0o600 });
  const workspace = join(root, 'workspace');
  const home = join(root, 'isolated-hermes-home');
  const children = [], spawns = [], gateways = [];

  class FakeGateway extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.connected = false;
      this.closed = false;
      this.closeCount = 0;
      this.requests = [];
      this.responses = [];
      this.serverRequests = new Map();
      this.respondResult = true;
      gateways.push(this);
    }
    async connect() {
      if (connect) await connect(this);
      if (this.closed) throw new Error('Gateway connection was closed');
      this.connected = true;
    }
    async request(method, params) {
      this.requests.push({ method, params });
      return request ? request(method, params, this) : { ok: true };
    }
    deliver(value) {
      this.serverRequests.set(value.id, value);
      this.emit('serverRequest', value);
    }
    event(value) {
      if (value.type === 'request.cancel') this.serverRequests.delete(value.payload?.id);
      this.emit('event', value);
    }
    respond(id, result) {
      if (!this.connected || !this.respondResult || !this.serverRequests.has(id)) return false;
      this.responses.push({ id, result });
      this.serverRequests.delete(id);
      return true;
    }
    respondApproval(id, choice = 'deny') {
      const pending = this.serverRequests.get(id);
      if (!pending || pending.method !== 'approval') return false;
      const offered = pending.params?.choices;
      if (choice !== 'deny' && Array.isArray(offered) && offered.length && !offered.includes(choice)) {
        throw new Error('The backend did not offer this approval choice');
      }
      return this.respond(id, { choice });
    }
    respondError(id, code = -32601, message = 'Unsupported client request') {
      if (!this.connected || !this.serverRequests.has(id)) return false;
      this.responses.push({ id, error: { code, message } });
      this.serverRequests.delete(id);
      return true;
    }
    disconnect() {
      this.connected = false;
      this.serverRequests.clear();
      this.emit('disconnect', { code: 1006 });
    }
    close() {
      this.closeCount += 1;
      this.closed = true;
      this.disconnect();
    }
  }

  const spawnImpl = (file, args, options) => {
    const child = new FakeChild();
    spawns.push({ file, args, options, livePredecessors: children.filter(value => !value.exited) });
    children.push(child);
    if (autoReady) queueMicrotask(() => child.ready(19200 + children.length));
    return child;
  };
  const manager = new HermesManager({ workspace, settingsPath, home, spawnImpl, Gateway: FakeGateway, startupTimeoutMs });
  t.after(async () => {
    // Release even a child deliberately held open by a failed race test.
    for (const child of children) child.autoExitOnKill = true;
    const stopped = manager.stop();
    for (const child of children) if (!child.exited) child.exit(null, 'SIGTERM');
    await stopped;
    rmSync(root, { recursive: true, force: true });
  });
  return { root, executable, settingsPath, workspace, home, manager, children, spawns, gateways };
}

function approval(id = 'outer-approval', choices = ['once', 'deny']) {
  return { id, method: 'approval', params: { session_id: 'runtime-1', request_id: 'inner-approval', command: 'write a report', choices } };
}

test('startup deduplicates launch, waits for readiness, and isolates subprocess configuration', async t => {
  const h = fixture(t, { autoReady: false });
  const statuses = [];
  h.manager.on('status', value => statuses.push(value));
  const first = h.manager.start();
  const second = h.manager.start();
  assert.equal(h.spawns.length, 1);
  assert.equal(h.manager.status().state, 'starting');
  assert.equal(h.gateways.length, 0);
  const spawn = h.spawns[0];
  assert.equal(spawn.file, h.executable);
  assert.equal(spawn.options.shell, false);
  assert.deepEqual(spawn.args, ['serve', '--host', '127.0.0.1', '--port', '0', '--isolated']);
  assert.equal(spawn.options.cwd, h.workspace);
  assert.equal(spawn.options.env.TERMINAL_CWD, h.workspace);
  assert.equal(spawn.options.env.HERMES_HOME, h.home);
  assert.match(spawn.options.env.HERMES_DASHBOARD_SESSION_TOKEN, /^[a-f0-9]{64}$/);
  h.children[0].stderr.emit('data', Buffer.from('private startup log'));
  h.children[0].stdout.emit('data', Buffer.from('HERMES_BACKEND_RE'));
  assert.equal(h.gateways.length, 0);
  h.children[0].stdout.emit('data', Buffer.from('ADY port=19201\n'));
  assert.equal((await first).state, 'ready');
  assert.equal((await second).state, 'ready');
  assert.equal(h.gateways.length, 1);
  assert.equal(h.gateways[0].options.url, 'ws://127.0.0.1:19201/api/ws');
  assert.equal(h.gateways[0].options.token, spawn.options.env.HERMES_DASHBOARD_SESSION_TOKEN);
  assert.ok(!JSON.stringify(statuses).includes('private startup log'));
  assert.ok(!JSON.stringify(statuses).includes(spawn.options.env.HERMES_DASHBOARD_SESSION_TOKEN));
  await h.manager.start();
  assert.equal(h.spawns.length, 1, 'Starting an already ready Agent must be idempotent');
});

test('settings persist privately, reject unsafe values, and cannot change a running executable', async t => {
  const h = fixture(t);
  await h.manager.saveSettings({ executable: `  ${h.executable}  `, apiKey: 'must-not-persist' });
  assert.deepEqual(JSON.parse(readFileSync(h.settingsPath, 'utf8')), { executable: h.executable });
  if (process.platform !== 'win32') assert.equal(statSync(h.settingsPath).mode & 0o777, 0o600);
  assert.equal(resolveExecutable(h.executable), h.executable);
  for (const input of [null, {}, { executable: 42 }, { executable: 'hermes\n--other' }, { executable: 'bad\0path' }]) {
    await assert.rejects(h.manager.saveSettings(input));
  }
  assert.throws(() => resolveExecutable('bad\npath'));
  await h.manager.start();
  await assert.rejects(h.manager.saveSettings({ executable: '' }));
  assert.equal(h.manager.settings.executable, h.executable);
});

test('missing executable never launches a process', async t => {
  const h = fixture(t);
  await h.manager.saveSettings({ executable: join(h.root, 'does-not-exist') });
  const status = await h.manager.start();
  assert.equal(status.state, 'missing');
  assert.equal(h.spawns.length, 0);
  assert.equal(h.gateways.length, 0);
});

test('startup timeout terminates the process and does not connect a gateway', async t => {
  const h = fixture(t, { autoReady: false, startupTimeoutMs: 15 });
  await assert.rejects(h.manager.start(), /逾時|timed out/i);
  await nextTurn();
  assert.equal(h.children[0].exited, true);
  assert.ok(h.children[0].killSignals.includes('SIGTERM'));
  assert.equal(h.gateways.length, 0);
  assert.equal(h.manager.status().state, 'error');
});

test('stop during process startup cancels readiness without opening a late gateway', async t => {
  const h = fixture(t, { autoReady: false });
  const starting = assert.rejects(h.manager.start());
  await h.manager.stop();
  await starting;
  h.children[0].ready();
  await nextTurn();
  assert.equal(h.manager.status().state, 'stopped');
  assert.equal(h.manager.child, null);
  assert.equal(h.gateways.length, 0);
});

test('stop while gateway connects cannot publish ready after cancellation', async t => {
  const gate = deferred();
  const h = fixture(t, { connect: () => gate.promise });
  const statuses = [];
  h.manager.on('status', value => statuses.push(value.state));
  const starting = assert.rejects(h.manager.start());
  await nextTurn();
  assert.equal(h.gateways.length, 1);
  const stopping = h.manager.stop();
  gate.resolve();
  await Promise.all([starting, stopping]);
  assert.equal(h.manager.status().state, 'stopped');
  assert.equal(h.manager.child, null);
  assert.equal(h.manager.gateway, null);
  assert.equal(h.children[0].exited, true);
  assert.ok(!statuses.includes('ready'));
});

test('reconnecting after disconnect terminates the previous owned process before replacement', async t => {
  const h = fixture(t);
  await h.manager.start();
  const oldChild = h.children[0], oldGateway = h.gateways[0];
  oldGateway.disconnect();
  assert.equal(h.manager.status().state, 'error');
  await h.manager.start();
  assert.equal(h.children.length, 2);
  assert.deepEqual(h.spawns[1].livePredecessors, [], 'A reconnect must not orphan an earlier Hermes process');
  assert.equal(oldChild.exited, true);
  assert.ok(oldChild.killSignals.includes('SIGTERM'));
  assert.equal(oldGateway.closed, true);
  assert.equal(h.manager.child, h.children[1]);
  assert.equal(h.manager.status().state, 'ready');
});

test('stop during reconnect cleanup prevents a replacement process from starting', async t => {
  const h = fixture(t);
  await h.manager.start();
  const oldChild = h.children[0];
  oldChild.autoExitOnKill = false;
  h.gateways[0].disconnect();
  const reconnecting = h.manager.start().then(value => ({ value }), error => ({ error }));
  await nextTurn();
  const stopping = h.manager.stop();
  oldChild.exit(null, 'SIGTERM');
  await Promise.all([reconnecting, stopping]);
  assert.equal(h.children.length, 1, 'Cancelling cleanup must also cancel the following launch');
  assert.equal(h.manager.child, null);
  assert.equal(h.manager.gateway, null);
  assert.equal(h.manager.status().state, 'stopped');
});

test('a new start waits for an in-progress stop to reap the prior process', async t => {
  const h = fixture(t);
  await h.manager.start();
  const oldChild = h.children[0];
  oldChild.autoExitOnKill = false;
  const stopping = h.manager.stop();
  const starting = h.manager.start();
  await nextTurn();
  const spawnCountWhileStopping = h.spawns.length;
  oldChild.exit(null, 'SIGTERM');
  await Promise.all([stopping, starting]);
  assert.equal(spawnCountWhileStopping, 1, 'A requested restart must wait until the old process exits');
  assert.equal(h.children.length, 2);
  assert.deepEqual(h.spawns[1].livePredecessors, []);
  assert.equal(h.manager.status().state, 'ready');
  assert.equal(h.manager.child, h.children[1]);
});

test('events and questions from a superseded gateway cannot alter the current session', async t => {
  const h = fixture(t);
  await h.manager.start();
  const oldGateway = h.gateways[0];
  await h.manager.stop();
  await h.manager.start();
  const current = h.gateways[1];
  current.deliver(approval('shared-id'));
  const emitted = [];
  for (const name of ['hermes', 'approval', 'clarification']) h.manager.on(name, value => emitted.push({ name, value }));
  oldGateway.event({ type: 'message.start', session_id: 'stale-session' });
  oldGateway.event({ type: 'request.cancel', payload: { id: 'shared-id' } });
  oldGateway.deliver({ id: 'stale-question', method: 'clarify', params: { questions: [] } });
  oldGateway.deliver(approval('shared-id', ['always', 'deny']));
  oldGateway.disconnect();
  assert.deepEqual(emitted, [], 'Superseded gateway callbacks must not enter the renderer');
  assert.equal(h.manager.status().state, 'ready');
  assert.equal(h.manager.status().active, false);
  assert.equal(h.manager.pending.has('stale-question'), false);
  assert.deepEqual(h.manager.pending.get('shared-id').params.choices, ['once', 'deny']);
  h.manager.reply('shared-id', 'approval', { choice: 'once' });
  assert.deepEqual(current.responses.at(-1), { id: 'shared-id', result: { choice: 'once' } });
  assert.equal(oldGateway.responses.length, 0);
});

test('prompt submission prevents duplicate work until completion and constrains session workspace', async t => {
  const h = fixture(t);
  await h.manager.start();
  const gateway = h.gateways[0];
  await h.manager.request('session.create', { cwd: '/untrusted', cwd_explicit: false, source: 'desktop' });
  assert.deepEqual(gateway.requests.at(-1), { method: 'session.create', params: { cwd: h.workspace, cwd_explicit: true, source: 'cognitive-workbench' } });
  await h.manager.request('session.resume', { session_id: 'stored-1', source: 'desktop' });
  assert.deepEqual(gateway.requests.at(-1), { method: 'session.resume', params: { session_id: 'stored-1', source: 'cognitive-workbench' } });
  await h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Write the report' });
  assert.equal(h.manager.status().active, true);
  await assert.rejects(h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Write it again' }));
  await h.manager.request('session.interrupt', { session_id: 'runtime-1' });
  assert.equal(h.manager.status().active, true, 'Interrupt acknowledgement alone does not prove execution has stopped');
  gateway.event({ type: 'message.complete', session_id: 'runtime-1', payload: { status: 'interrupted' } });
  assert.equal(h.manager.status().active, false);
  await h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Start a new task' });
  assert.equal(gateway.requests.filter(value => value.method === 'prompt.submit').length, 2);
  for (const params of [{ session_id: 'runtime-2', text: ' ' }, { text: 'Missing session' }, { session_id: 'runtime-2', text: 'x'.repeat(32_001) }]) {
    await assert.rejects(h.manager.request('prompt.submit', params));
  }
  await assert.rejects(h.manager.request('terminal.execute', { command: 'anything' }));
});

test('failed prompt submission releases its session and never retries automatically', async t => {
  const h = fixture(t, { request: method => {
    if (method === 'prompt.submit') throw new Error('Transport failed');
    return {};
  } });
  await h.manager.start();
  await assert.rejects(h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Do work' }), /Transport failed/);
  assert.equal(h.manager.status().active, false);
  assert.equal(h.gateways[0].requests.filter(value => value.method === 'prompt.submit').length, 1);
});

test('a prompt response timeout keeps the session busy because execution outcome is unknown', async t => {
  const h = fixture(t, { request: method => {
    if (method === 'prompt.submit') throw Object.assign(new Error('Request timed out'), { code: 'REQUEST_TIMEOUT' });
    return {};
  } });
  await h.manager.start();
  await assert.rejects(h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Do work' }), error => error.code === 'REQUEST_TIMEOUT');
  assert.equal(h.manager.status().active, true);
  await assert.rejects(h.manager.request('prompt.submit', { session_id: 'runtime-1', text: 'Try the same work again' }));
  assert.equal(h.gateways[0].requests.filter(value => value.method === 'prompt.submit').length, 1);
  h.gateways[0].event({ type: 'message.complete', session_id: 'runtime-1' });
  assert.equal(h.manager.status().active, false);
});

test('approval waits for an explicit matching reply, and cancelled or answered cards cannot reply', async t => {
  const h = fixture(t);
  await h.manager.start();
  const gateway = h.gateways[0];
  gateway.deliver(approval());
  assert.equal(gateway.responses.length, 0);
  assert.equal(h.manager.pending.size, 1);
  assert.throws(() => h.manager.reply('outer-approval', 'clarify', { answers: {} }));
  assert.throws(() => h.manager.reply('inner-approval', 'approval', { choice: 'once' }));
  assert.deepEqual(h.manager.reply('outer-approval', 'approval', { choice: 'once' }), { ok: true });
  assert.deepEqual(gateway.responses, [{ id: 'outer-approval', result: { choice: 'once' } }]);
  assert.throws(() => h.manager.reply('outer-approval', 'approval', { choice: 'once' }));
  gateway.deliver(approval('cancelled'));
  gateway.event({ type: 'request.cancel', payload: { id: 'cancelled' } });
  assert.equal(h.manager.pending.has('cancelled'), false);
  assert.throws(() => h.manager.reply('cancelled', 'approval', { choice: 'once' }));
});

test('approval cannot broaden beyond the choices offered by Hermes', async t => {
  const h = fixture(t);
  await h.manager.start();
  const gateway = h.gateways[0];
  gateway.deliver(approval('limited', ['once', 'deny']));
  assert.throws(() => h.manager.reply('limited', 'approval', { choice: 'always' }));
  assert.throws(() => h.manager.reply('limited', 'approval', { choice: 'session' }));
  assert.equal(gateway.responses.length, 0);
  assert.equal(h.manager.pending.has('limited'), true);
  h.manager.reply('limited', 'approval', { choice: 'deny' });
  assert.deepEqual(gateway.responses.at(-1), { id: 'limited', result: { choice: 'deny' } });
});

test('an expired approval must not report success, retry, or allow its old card to answer later', async t => {
  const h = fixture(t);
  await h.manager.start();
  const gateway = h.gateways[0];
  gateway.deliver(approval('not-delivered'));
  gateway.respondResult = false;
  assert.throws(() => h.manager.reply('not-delivered', 'approval', { choice: 'once' }));
  assert.equal(gateway.responses.length, 0);
  assert.equal(h.manager.pending.has('not-delivered'), false);
  gateway.respondResult = true;
  assert.throws(() => h.manager.reply('not-delivered', 'approval', { choice: 'once' }));
  assert.equal(gateway.responses.length, 0);
});

test('request.cancel also clears the valid numeric JSON-RPC id zero', async t => {
  const h = fixture(t);
  await h.manager.start();
  const gateway = h.gateways[0];
  gateway.deliver(approval(0));
  assert.equal(h.manager.pending.has('0'), true);
  gateway.event({ type: 'request.cancel', payload: { id: 0 } });
  assert.equal(h.manager.pending.has('0'), false);
  assert.throws(() => h.manager.reply(0, 'approval', { choice: 'once' }));
  assert.equal(gateway.responses.length, 0);
});
