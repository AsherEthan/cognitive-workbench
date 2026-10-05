import { EventEmitter } from 'node:events';
import WebSocket from 'ws';

// Verified against NousResearch/hermes-agent at
// 6590f13a1ba21b18224a0f53ef2ead004b5fa7d6:
// tui_gateway/contracts/{sessions,prompt_voice,server_requests,events}.py
// apps/shared/src/{json-rpc-channel,json-rpc-gateway}.ts
// This is a client of Hermes' existing gateway, not a replacement agent loop.

export class HermesGatewayError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = 'HermesGatewayError';
    this.code = code;
    if (data !== undefined) this.data = data;
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' || typeof value === 'number';
const positiveTimeout = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be positive`);
  return value;
};

/**
 * Authenticated JSON-RPC client for `hermes serve`'s /api/ws endpoint.
 *
 * Events:
 *   event:         the backend's raw {type, session_id?, seq?, payload?}
 *   serverRequest: {id, method, params, replayed?}; answer with respond(id, result)
 *   disconnect:    {code, reason, error}
 *   error:         transport/protocol errors, when an error listener is installed
 *
 * A request timeout never retries a prompt: its execution outcome is unknown.
 * reconnect/resume is a caller decision. No user configuration is read or written.
 */
export class HermesGateway extends EventEmitter {
  constructor({
    url,
    token,
    WebSocketImpl = WebSocket,
    requestTimeoutMs = 30_000,
    connectTimeoutMs = 30_000,
    heartbeatIntervalMs = 15_000,
    heartbeatDeadlineMs = 45_000,
  } = {}) {
    super();
    let endpoint;
    try { endpoint = new URL(url); } catch { throw new TypeError('A Hermes gateway URL is required'); }
    if (endpoint.protocol === 'http:') endpoint.protocol = 'ws:';
    if (endpoint.protocol === 'https:') endpoint.protocol = 'wss:';
    if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new TypeError('Use an HTTP or WebSocket gateway URL');
    if (endpoint.username || endpoint.password) throw new TypeError('Gateway URLs must not contain user credentials');
    if (endpoint.pathname === '/') endpoint.pathname = '/api/ws';
    if (token) endpoint.searchParams.set('token', token);
    this._url = endpoint.toString();
    this._token = token || endpoint.searchParams.get('token') || '';
    this._WebSocket = WebSocketImpl;
    this._requestTimeoutMs = positiveTimeout(requestTimeoutMs, 'requestTimeoutMs');
    this._connectTimeoutMs = positiveTimeout(connectTimeoutMs, 'connectTimeoutMs');
    this._heartbeatIntervalMs = heartbeatIntervalMs;
    this._heartbeatDeadlineMs = positiveTimeout(heartbeatDeadlineMs, 'heartbeatDeadlineMs');
    this._state = 'idle';
    this._socket = null;
    this._pending = new Map();
    this._serverRequests = new Map();
    this._nextId = 0;
    this._bindings = [];
  }

  get connected() { return this._state === 'ready'; }
  get connectionState() { return this._state; }

  connect() {
    if (this.connected) return Promise.resolve();
    if (this._connectPromise) return this._connectPromise;
    this._state = 'connecting';
    const connection = new Promise((resolve, reject) => {
      this._resolveConnect = resolve;
      this._rejectConnect = reject;
    });
    this._connectPromise = connection;
    this._connectTimer = setTimeout(() => {
      const error = new HermesGatewayError('Hermes did not send gateway.ready in time', 'CONNECT_TIMEOUT');
      this._reportError(error);
      this._end(error, { code: null, reason: 'Connection timed out' }, true);
    }, this._connectTimeoutMs);

    try {
      const socket = new this._WebSocket(this._url);
      this._socket = socket;
      this._listen(socket, 'message', message => {
        if (this._socket === socket) this._onMessage(message);
      });
      this._listen(socket, 'error', event => {
        if (this._socket !== socket) return;
        const original = event instanceof Error ? event : event?.error;
        const message = this._redact(original?.message || 'Hermes WebSocket connection failed');
        const error = new HermesGatewayError(message, 'TRANSPORT_ERROR');
        this._reportError(error);
        this._end(error, { code: null, reason: message }, true);
      });
      this._listen(socket, 'close', (event, rawReason) => {
        if (this._socket !== socket) return;
        const code = typeof event === 'number' ? event : event?.code ?? null;
        const reason = this._redact(String(rawReason ?? event?.reason ?? ''));
        const error = new HermesGatewayError(`Hermes disconnected${code ? ` (${code})` : ''}`, 'DISCONNECTED');
        this._end(error, { code, reason });
      });
    } catch (original) {
      const error = new HermesGatewayError(this._redact(original.message), 'TRANSPORT_ERROR');
      this._reportError(error);
      this._end(error, { code: null, reason: 'Could not open connection' }, true);
    }
    return connection;
  }

  request(method, params = {}, options = {}) {
    if (!this.connected) return Promise.reject(new HermesGatewayError('Hermes gateway is not ready', 'NOT_CONNECTED'));
    if (typeof method !== 'string' || !method || !isObject(params)) {
      return Promise.reject(new TypeError('A request needs a method and a parameters object'));
    }
    let timeoutMs;
    try {
      timeoutMs = positiveTimeout(typeof options === 'number' ? options : options.timeoutMs ?? this._requestTimeoutMs, 'timeoutMs');
    } catch (error) { return Promise.reject(error); }
    const id = `cw-${++this._nextId}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new HermesGatewayError(`Hermes request timed out: ${method}`, 'REQUEST_TIMEOUT', { method, id }));
      }, timeoutMs);
      this._pending.set(id, { resolve, reject, timer, method });
      try { this._send({ jsonrpc: '2.0', id, method, params }); }
      catch (error) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(error);
      }
    });
  }

  createSession(params = {}) {
    // source:'desktop' enables Hermes' own window/preview tools, which this
    // independent UI does not implement. Use our actual client identity.
    return this.request('session.create', { source: 'cognitive-workbench', ...params });
  }
  resumeSession(storedSessionId, params = {}) {
    return this.request('session.resume', { source: 'cognitive-workbench', ...params, session_id: storedSessionId });
  }
  listSessions(params = {}) { return this.request('session.list', params); }
  submit(sessionId, text, params = {}) {
    return this.request('prompt.submit', { ...params, session_id: sessionId, text });
  }
  interrupt(sessionId, params = {}) {
    return this.request('session.interrupt', { ...params, session_id: sessionId });
  }
  acknowledgeApproval(sessionId, requestId) {
    return this.request('approval.received', { session_id: sessionId, request_id: requestId });
  }

  /** Reply to a server request's outer JSON-RPC id; there is no second server ack. */
  respond(requestId, result) {
    if (!isObject(result)) throw new TypeError('A server request result must be an object');
    return this._reply(requestId, { result });
  }
  respondApproval(requestId, choice = 'deny', { all } = {}) {
    const pending = this._serverRequests.get(requestId);
    if (!pending || pending.method !== 'approval') return false;
    if (!['once', 'session', 'always', 'deny'].includes(choice)) throw new TypeError('Invalid approval choice');
    const offered = pending.params?.choices;
    if (choice !== 'deny' && Array.isArray(offered) && offered.length && !offered.includes(choice)) {
      throw new TypeError('The backend did not offer this approval choice');
    }
    return this.respond(requestId, { choice, ...(all === undefined ? {} : { all: Boolean(all) }) });
  }
  respondError(requestId, code = -32601, message = 'Unsupported client request') {
    return this._reply(requestId, { error: { code, message } });
  }

  close() {
    if (!this._socket && !this._connectPromise) return;
    this._end(new HermesGatewayError('Hermes connection was closed', 'CONNECTION_CLOSED'), { code: 1000, reason: 'Client closed' }, true);
  }

  _listen(socket, name, handler) {
    if (typeof socket.on === 'function') socket.on(name, handler);
    else socket.addEventListener(name, handler);
    this._bindings.push([socket, name, handler]);
  }
  _send(frame) {
    if (!this._socket || this._socket.readyState !== (this._WebSocket.OPEN ?? 1)) {
      throw new HermesGatewayError('Hermes WebSocket is not open', 'NOT_CONNECTED');
    }
    this._socket.send(JSON.stringify(frame));
  }
  _reply(id, response) {
    if (!this.connected || !this._serverRequests.has(id)) return false;
    this._send({ jsonrpc: '2.0', id, ...response });
    this._serverRequests.delete(id);
    return true;
  }
  _redact(message) {
    let clean = String(message || 'Hermes gateway error');
    if (this._token) {
      clean = clean.replaceAll(this._token, '[redacted]').replaceAll(encodeURIComponent(this._token), '[redacted]');
    }
    return clean;
  }
  _reportError(error) {
    // EventEmitter's special unhandled 'error' behavior must not kill Electron
    // if a consumer relies on request/connect rejection instead of a listener.
    if (this.listenerCount('error')) this.emit('error', error);
  }

  _onMessage(message) {
    let frame;
    try {
      const data = message && typeof message === 'object' && 'data' in message ? message.data : message;
      const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
      frame = JSON.parse(text);
      if (!isObject(frame) || frame.jsonrpc !== '2.0') throw new Error('Invalid JSON-RPC envelope');
    } catch {
      this._reportError(new HermesGatewayError('Ignored malformed Hermes gateway message', 'PROTOCOL_ERROR'));
      return;
    }

    if (frame.method === 'event') {
      if (!isObject(frame.params) || typeof frame.params.type !== 'string') {
        this._reportError(new HermesGatewayError('Ignored invalid Hermes event', 'PROTOCOL_ERROR'));
        return;
      }
      const event = frame.params;
      if (event.type === 'gateway.ready' && this._state === 'connecting') {
        this._state = 'ready';
        clearTimeout(this._connectTimer);
        this._connectTimer = null;
        // Advertise before the caller can submit its first turn. Without this,
        // Hermes fails clarify/approval requests for legacy clients immediately.
        const readySocket = this._socket;
        this.request('client.capabilities', { server_requests: true }).catch(error => {
          if (this._socket === readySocket && this.connected && error.code !== -32601) this._reportError(error);
        });
        if (event.payload?.heartbeat === true) this._startHeartbeat();
        const resolve = this._resolveConnect;
        this._resolveConnect = this._rejectConnect = this._connectPromise = null;
        resolve?.();
      }
      if (event.type === 'request.cancel') this._serverRequests.delete(event.payload?.id);
      this.emit('event', event);
      return;
    }

    if (typeof frame.method === 'string' && isId(frame.id)) {
      this._deliverServerRequest(frame);
      return;
    }
    if (!isId(frame.id)) return;
    const pending = this._pending.get(frame.id);
    if (!pending) return; // Late response to a timeout, or another client's id.
    this._pending.delete(frame.id);
    clearTimeout(pending.timer);
    if (isObject(frame.error)) {
      pending.reject(new HermesGatewayError(this._redact(frame.error.message || 'Hermes request failed'), frame.error.code, frame.error.data));
      return;
    }
    if (!Object.hasOwn(frame, 'result')) {
      pending.reject(new HermesGatewayError('Hermes response has no result or error', 'PROTOCOL_ERROR'));
      return;
    }
    // Reconnect restores unanswered questions as well as transcript rows.
    if (Array.isArray(frame.result?.open_requests)) {
      for (const entry of frame.result.open_requests) this._deliverServerRequest(entry, true);
    }
    pending.resolve(frame.result);
  }

  _deliverServerRequest(frame, replayed = false) {
    if (!isId(frame.id) || typeof frame.method !== 'string' || !isObject(frame.params)) return;
    if (this._serverRequests.has(frame.id)) return;
    const request = { id: frame.id, method: frame.method, params: frame.params, ...(replayed ? { replayed: true } : {}) };
    this._serverRequests.set(frame.id, request);
    if (!this.listenerCount('serverRequest')) {
      this.respondError(frame.id); // Never silently approve or wait forever.
      return;
    }
    try { this.emit('serverRequest', request); }
    catch (error) {
      this.respondError(frame.id, -32603, 'Client request handler failed');
      this._reportError(error);
    }
  }

  _startHeartbeat() {
    if (!(this._heartbeatIntervalMs > 0)) return;
    clearInterval(this._heartbeatTimer);
    const socket = this._socket;
    let pending = false;
    this._heartbeatTimer = setInterval(() => {
      if (this._socket !== socket || !this.connected || pending) return;
      pending = true;
      this.request('gateway.ping', {}, this._heartbeatDeadlineMs).catch(error => {
        if (this._socket === socket && this.connected) {
          this._reportError(error);
          this._end(error, { code: null, reason: 'Heartbeat failed' }, true);
        }
      }).finally(() => { pending = false; });
    }, this._heartbeatIntervalMs);
    this._heartbeatTimer.unref?.();
  }

  _end(error, info, closeSocket = false) {
    const socket = this._socket;
    const wasActive = Boolean(socket || this._connectPromise);
    this._socket = null;
    this._state = 'closed';
    clearTimeout(this._connectTimer);
    clearInterval(this._heartbeatTimer);
    this._connectTimer = this._heartbeatTimer = null;
    this._rejectConnect?.(error);
    this._resolveConnect = this._rejectConnect = this._connectPromise = null;
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pending.clear();
    this._serverRequests.clear();
    for (const [target, name, handler] of this._bindings) {
      if (typeof target.off === 'function') target.off(name, handler);
      else target.removeEventListener(name, handler);
    }
    this._bindings = [];
    if (socket && closeSocket) {
      // ws emits a late error when a CONNECTING socket is terminated. It no
      // longer belongs to this client, but still needs a harmless error sink.
      socket.on?.('error', () => {});
      try {
        if (socket.readyState === (this._WebSocket.OPEN ?? 1)) {
          socket.close(1000);
          if (socket.readyState !== (this._WebSocket.CLOSED ?? 3) && typeof socket.terminate === 'function') {
            // A peer that never completes the close handshake must not keep
            // the desktop process alive indefinitely.
            const timer = setTimeout(() => {
              if (socket.readyState !== (this._WebSocket.CLOSED ?? 3)) socket.terminate();
            }, 1_000);
            timer.unref?.();
          }
        } else socket.terminate?.();
      } catch { /* The transport is already dead. */ }
    }
    if (wasActive) this.emit('disconnect', { ...info, error });
  }
}

export default HermesGateway;
