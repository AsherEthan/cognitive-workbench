import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { HermesGateway } from '../lib/hermes-gateway.mjs';

class FakeWebSocket extends EventEmitter {
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }
  open() { this.readyState = 1; this.emit('open'); }
  send(text) {
    assert.equal(this.readyState, 1);
    const frame = JSON.parse(text);
    this.sent.push(frame);
    if (frame.method === 'client.capabilities') {
      queueMicrotask(() => this.receive({ jsonrpc: '2.0', id: frame.id, result: { server_requests: ['approval', 'clarify'] } }));
    }
  }
  receive(frame) { this.emit('message', Buffer.from(JSON.stringify(frame))); }
  event(type, payload, sessionId) {
    this.receive({ jsonrpc: '2.0', method: 'event', params: { type, ...(sessionId ? { session_id: sessionId } : {}), ...(payload === undefined ? {} : { payload }) } });
  }
  close(code = 1000) { this.readyState = 3; this.emit('close', code, Buffer.from('closed')); }
  terminate() { this.close(1006); }
  result(frame, result) { this.receive({ jsonrpc: '2.0', id: frame.id, result }); }
}

async function connected(t, options = {}) {
  const gateway = new HermesGateway({ url: 'http://127.0.0.1:19119', token: 'test-token', WebSocketImpl: FakeWebSocket, heartbeatIntervalMs: 0, ...options });
  t.after(() => gateway.close());
  const connection = gateway.connect();
  const socket = FakeWebSocket.instances.at(-1);
  socket.open();
  socket.event('gateway.ready', { heartbeat: true, replay_epoch: 'epoch-1' });
  await connection;
  return { gateway, socket };
}

test('connection waits for gateway.ready and advertises server requests', async t => {
  const gateway = new HermesGateway({ url: 'ws://127.0.0.1:19119/api/ws', token: 'a token', WebSocketImpl: FakeWebSocket });
  t.after(() => gateway.close());
  let ready = false;
  const connection = gateway.connect().then(() => { ready = true; });
  const socket = FakeWebSocket.instances.at(-1);
  socket.open();
  await Promise.resolve();
  assert.equal(ready, false);
  assert.equal(new URL(socket.url).searchParams.get('token'), 'a token');
  socket.event('gateway.ready', { heartbeat: false, replay_epoch: 'epoch-1' });
  await connection;
  assert.equal(gateway.connected, true);
  assert.deepEqual(socket.sent[0].params, { server_requests: true });
  assert.equal(socket.sent[0].method, 'client.capabilities');
});

test('concurrent replies match request IDs, including structured RPC errors', async t => {
  const { gateway, socket } = await connected(t);
  const first = gateway.request('session.list', { limit: 5 });
  const firstFrame = socket.sent.at(-1);
  const second = gateway.request('session.create', { source: 'cognitive-workbench' });
  const secondFrame = socket.sent.at(-1);
  socket.result(secondFrame, { session_id: 'runtime-2', stored_session_id: 'stored-2' });
  socket.result(firstFrame, { sessions: [{ id: 'stored-1' }] });
  assert.deepEqual(await first, { sessions: [{ id: 'stored-1' }] });
  assert.deepEqual(await second, { session_id: 'runtime-2', stored_session_id: 'stored-2' });
  const rejected = gateway.request('unknown.method');
  const check = assert.rejects(rejected, error => error.code === -32601 && error.data?.method === 'unknown.method');
  socket.receive({ jsonrpc: '2.0', id: socket.sent.at(-1).id, error: { code: -32601, message: 'Unknown method', data: { method: 'unknown.method' } } });
  await check;
});

test('forwards raw events and tolerates malformed frames without losing the next reply', async t => {
  const { gateway, socket } = await connected(t);
  const events = [];
  const errors = [];
  gateway.on('event', event => events.push(event));
  gateway.on('error', error => errors.push(error));
  for (const text of ['{bad json', 'null', '[]', '{"jsonrpc":"2.0","method":"event","params":null}']) socket.emit('message', text);
  const raw = { type: 'message.delta', session_id: 'runtime-1', seq: 9, payload: { text: '你好' } };
  socket.receive({ jsonrpc: '2.0', method: 'event', params: raw });
  assert.deepEqual(events, [raw]);
  assert.equal(errors.length, 4);
  assert.ok(errors.every(error => error.code === 'PROTOCOL_ERROR'));
  const request = gateway.request('session.list');
  socket.result(socket.sent.at(-1), { sessions: [] });
  assert.deepEqual(await request, { sessions: [] });
});

test('remote disconnect rejects every outstanding request exactly once', async t => {
  const { gateway, socket } = await connected(t);
  const disconnects = [];
  gateway.on('disconnect', event => disconnects.push(event));
  const first = assert.rejects(gateway.request('session.list'), error => error.code === 'DISCONNECTED');
  const second = assert.rejects(gateway.request('prompt.submit', { session_id: 'r1', text: 'hi' }), error => error.code === 'DISCONNECTED');
  socket.close(1006);
  await Promise.all([first, second]);
  gateway.close();
  assert.equal(gateway.connected, false);
  assert.equal(disconnects.length, 1);
  assert.equal(disconnects[0].code, 1006);
});

test('timeout rejects once and a late response never retries or completes the next call', async t => {
  const { gateway, socket } = await connected(t, { requestTimeoutMs: 15 });
  const old = gateway.request('prompt.submit', { session_id: 'r1', text: 'do work' });
  const oldFrame = socket.sent.at(-1);
  await assert.rejects(old, error => error.code === 'REQUEST_TIMEOUT');
  socket.result(oldFrame, { status: 'streaming' });
  assert.equal(socket.sent.filter(frame => frame.method === 'prompt.submit').length, 1);
  const next = gateway.request('session.list');
  socket.result(socket.sent.at(-1), { sessions: [] });
  assert.deepEqual(await next, { sessions: [] });
});

test('ready timeout and explicit close reject waiting connections', async t => {
  const gateway = new HermesGateway({ url: 'ws://127.0.0.1:19119/api/ws', WebSocketImpl: FakeWebSocket, connectTimeoutMs: 15 });
  t.after(() => gateway.close());
  await assert.rejects(gateway.connect(), error => error.code === 'CONNECT_TIMEOUT');
  const next = gateway.connect();
  const check = assert.rejects(next, error => error.code === 'CONNECTION_CLOSED');
  gateway.close();
  await check;
});

test('approval replies use the outer request ID and accept only an explicit offered choice', async t => {
  const { gateway, socket } = await connected(t);
  const requests = [];
  gateway.on('serverRequest', request => requests.push(request));
  const frame = { jsonrpc: '2.0', id: 'srq-7', method: 'approval', params: { session_id: 'runtime-1', request_id: 'approval-88', command: 'write report', choices: ['once', 'deny'] } };
  const count = socket.sent.length;
  socket.receive(frame);
  assert.equal(socket.sent.length, count, 'Receiving approval must not authorize it');
  assert.equal(requests[0].id, 'srq-7');
  assert.equal(requests[0].params.request_id, 'approval-88');
  assert.throws(() => gateway.respondApproval('srq-7', 'always'), /did not offer/);
  assert.equal(gateway.respondApproval('srq-7', 'once'), true);
  assert.deepEqual(socket.sent.at(-1), { jsonrpc: '2.0', id: 'srq-7', result: { choice: 'once' } });
  assert.equal(gateway.respondApproval('srq-7', 'once'), false, 'An answered card cannot send a second approval');
});

test('unsupported server requests fail closed and cancelled cards cannot answer later', async t => {
  const { gateway, socket } = await connected(t);
  socket.receive({ jsonrpc: '2.0', id: 'srq-unsupported', method: 'desktop.read', params: { session_id: 'runtime-1' } });
  assert.equal(socket.sent.at(-1).error.code, -32601);
  gateway.on('serverRequest', () => {});
  socket.receive({ jsonrpc: '2.0', id: 'srq-9', method: 'approval', params: { session_id: 'runtime-1', request_id: 'approval-9' } });
  socket.event('request.cancel', { id: 'srq-9', method: 'approval', reason: 'interrupted' }, 'runtime-1');
  assert.equal(gateway.respondApproval('srq-9', 'deny'), false);
});

test('resuming uses the stored ID and replays outstanding clarification requests', async t => {
  const { gateway, socket } = await connected(t);
  const requests = [];
  gateway.on('serverRequest', request => requests.push(request));
  const resumed = gateway.resumeSession('stored-123');
  const call = socket.sent.at(-1);
  assert.equal(call.method, 'session.resume');
  assert.deepEqual(call.params, { source: 'cognitive-workbench', session_id: 'stored-123' });
  const open = { id: 'srq-10', method: 'clarify', params: { session_id: 'runtime-new', questions: [{ qid: 'goal', question: 'What is your goal?' }] } };
  socket.result(call, { session_id: 'runtime-new', stored_session_id: 'stored-123', messages: [], open_requests: [open] });
  assert.equal((await resumed).session_id, 'runtime-new');
  assert.deepEqual(requests, [{ ...open, replayed: true }]);
  gateway.respond('srq-10', { answers: { goal: 'Finish the report' } });
  assert.deepEqual(socket.sent.at(-1), { jsonrpc: '2.0', id: 'srq-10', result: { answers: { goal: 'Finish the report' } } });
});

test('transport errors reject pending calls and redact the token', async t => {
  const { gateway, socket } = await connected(t);
  const errors = [];
  gateway.on('error', error => errors.push(error));
  const pending = assert.rejects(gateway.request('session.list'), error => error.code === 'TRANSPORT_ERROR');
  socket.emit('error', new Error('Failed ws://127.0.0.1/api/ws?token=test-token'));
  await pending;
  assert.equal(errors.length, 1);
  assert.ok(!errors[0].message.includes('test-token'));
  assert.ok(errors[0].message.includes('[redacted]'));
  await assert.rejects(gateway.request('session.list'), error => error.code === 'NOT_CONNECTED');
});

test('explicit close rejects requests already sent to a ready gateway', async t => {
  const { gateway } = await connected(t);
  const pending = assert.rejects(gateway.request('session.list'), error => error.code === 'CONNECTION_CLOSED');
  gateway.close();
  await pending;
  assert.equal(gateway.connected, false);
});

test('an old connection heartbeat rejection cannot close a new socket', async t => {
  const { gateway, socket } = await connected(t, { heartbeatIntervalMs: 5 });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(socket.sent.some(frame => frame.method === 'gateway.ping'));
  socket.close(1006);
  const reconnect = gateway.connect();
  const replacement = FakeWebSocket.instances.at(-1);
  replacement.open();
  replacement.event('gateway.ready', { heartbeat: false, replay_epoch: 'epoch-2' });
  await reconnect;
  await Promise.resolve();
  assert.equal(gateway.connected, true);
  const pending = gateway.request('session.list');
  replacement.result(replacement.sent.at(-1), { sessions: [] });
  assert.deepEqual(await pending, { sessions: [] });
});
