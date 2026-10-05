import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { accessSync, constants, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { HermesGateway } from './hermes-gateway.mjs';

const MAX_LOG = 4000;
const METHODS = new Set(['session.list', 'session.create', 'session.resume', 'prompt.submit', 'session.interrupt', 'approval.received']);

export function resolveExecutable(configured = '', env = process.env) {
  const value = configured.trim();
  if (value.length > 4096 || /[\r\n\0]/.test(value)) throw new Error('Hermes 路徑格式不正確。');
  const dirs = [...(env.PATH || '').split(delimiter), join(homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin', join(homedir(), '.hermes', 'hermes-agent', 'venv', 'bin')];
  const candidates = value
    ? (isAbsolute(value) ? [value] : value.startsWith('~/') ? [join(homedir(), value.slice(2))] : dirs.map(d => join(d, value)))
    : dirs.map(d => join(d, 'hermes'));
  for (const candidate of candidates) {
    try { accessSync(candidate, constants.X_OK); return resolve(candidate); } catch {}
  }
  return null;
}

export class HermesManager extends EventEmitter {
  constructor({ workspace, settingsPath, home, spawnImpl = spawn, Gateway = HermesGateway, startupTimeoutMs = 60_000 }) {
    super();
    Object.assign(this, { workspace, settingsPath, home, spawnImpl, Gateway, startupTimeoutMs });
    this.state = 'stopped';
    this.error = '';
    this.child = null;
    this.gateway = null;
    this.startPromise = null;
    this.terminationPromise = null;
    this.generation = 0;
    this.pending = new Map();
    this.activeSessions = new Set();
    this.settings = { executable: '' };
    try {
      const value = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (typeof value.executable === 'string') this.settings.executable = value.executable;
    } catch (error) {
      if (error.code !== 'ENOENT') this.error = '無法讀取桌面設定，請重新選擇 Hermes 路徑。';
    }
  }

  status() {
    let executable = null;
    try { executable = resolveExecutable(this.settings.executable); } catch {}
    return { state: this.state === 'stopped' && !executable ? 'missing' : this.state, executable, workspace: this.workspace, error: this.error || undefined, active: this.activeSessions.size > 0 };
  }

  publishStatus() { this.emit('status', this.status()); }

  async saveSettings(input) {
    if (!input || typeof input.executable !== 'string') throw new Error('請填寫 Hermes 可執行檔路徑，或留空自動尋找。');
    if (input.executable.length > 4096 || /[\r\n\0]/.test(input.executable)) throw new Error('Hermes 路徑格式不正確。');
    if (this.child || this.startPromise || this.terminationPromise) throw new Error('請先停止 Agent，再更換執行程式。');
    const settings = { executable: input.executable.trim() };
    mkdirSync(dirname(this.settingsPath), { recursive: true, mode: 0o700 });
    const temporary = this.settingsPath + '.tmp.' + randomBytes(8).toString('hex');
    writeFileSync(temporary, JSON.stringify(settings, null, 2) + '\n', { mode: 0o600 });
    renameSync(temporary, this.settingsPath);
    this.settings = settings;
    this.state = 'stopped'; this.error = ''; this.publishStatus();
    return settings;
  }

  async start() {
    if (this.state === 'ready') return this.status();
    if (this.startPromise) return this.startPromise;
    const generation = ++this.generation;
    this.startPromise = (async () => {
      // A disconnected gateway may still own a live Python process. Reap it
      // before replacing it, and ignore callbacks from its old generation.
      if (this.child || this.gateway || this.terminationPromise) await this.terminateChild();
      if (generation !== this.generation) return this.status();
      const executable = resolveExecutable(this.settings.executable);
      if (!executable) {
        this.state = 'missing'; this.error = '未找到 Hermes。請先完成 Hermes 安裝與模型設定，再回來連接。'; this.publishStatus();
        return this.status();
      }
      this.state = 'starting'; this.error = ''; this.publishStatus();
      return this.launch(executable, generation);
    })().finally(() => { this.startPromise = null; });
    return this.startPromise;
  }

  async launch(executable, generation) {
    const token = randomBytes(32).toString('hex');
    mkdirSync(this.workspace, { recursive: true, mode: 0o700 });
    const env = { ...process.env, HERMES_DASHBOARD_SESSION_TOKEN: token, HERMES_DESKTOP: '1', TERMINAL_CWD: this.workspace };
    if (this.home) env.HERMES_HOME = this.home;
    const child = this.spawnImpl(executable, ['serve', '--host', '127.0.0.1', '--port', '0', '--isolated'], {
      cwd: this.workspace, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    this.child = child;
    let exited = false;
    const ready = new Promise((resolveReady, rejectReady) => {
      let tail = '';
      const timer = setTimeout(() => rejectReady(new Error('Hermes 啟動逾時。請確認版本支援 hermes serve，且模型設定可以正常使用。')), this.startupTimeoutMs);
      const finish = (error, port) => { clearTimeout(timer); error ? rejectReady(error) : resolveReady(port); };
      child.stdout?.on('data', buffer => {
        tail = (tail + buffer.toString()).slice(-MAX_LOG);
        const match = tail.match(/HERMES_(?:BACKEND|DASHBOARD)_READY\s+port=(\d+)/);
        if (match) {
          const port = Number(match[1]);
          if (port > 0 && port < 65536) finish(null, port);
        }
      });
      // Drain stderr, but never send startup logs or credentials into the renderer.
      child.stderr?.on('data', () => {});
      child.once('error', error => finish(new Error('無法啟動 Hermes（' + (error.code || 'process_error') + '）。')));
      child.once('exit', (code, signal) => {
        exited = true;
        finish(new Error('Hermes 已結束（' + (signal || code || '0') + '）。請在終端確認 Hermes 能正常啟動。'));
        if (generation !== this.generation) return;
        this.child = null;
        this.gateway?.close(); this.gateway = null;
        this.pending.clear(); this.activeSessions.clear();
        if (this.state !== 'stopped') { this.state = 'error'; this.error ||= 'Agent 程式已結束，請重新連接。'; }
        this.publishStatus();
      });
    });
    try {
      const port = await ready;
      if (exited || generation !== this.generation) throw new Error('啟動已取消。');
      const gateway = new this.Gateway({ url: 'ws://127.0.0.1:' + port + '/api/ws', token });
      this.gateway = gateway;
      gateway.on('event', event => {
        if (generation !== this.generation || this.gateway !== gateway) return;
        const sid = event.session_id || event.payload?.session_id;
        if (event.type === 'message.start' && sid) this.activeSessions.add(sid);
        if (event.type === 'message.complete' && sid) this.activeSessions.delete(sid);
        if (event.type === 'request.cancel' && event.payload && Object.hasOwn(event.payload, 'id')) this.pending.delete(String(event.payload.id));
        this.emit('hermes', event);
      });
      gateway.on('serverRequest', request => {
        if (generation !== this.generation || this.gateway !== gateway) return;
        if (!['approval', 'clarify'].includes(request.method)) {
          gateway.respondError(request.id, -32601, '此介面尚未支援這項請求。');
          return;
        }
        this.pending.set(String(request.id), request);
        this.emit(request.method === 'approval' ? 'approval' : 'clarification', request);
      });
      gateway.on('error', () => {});
      gateway.on('disconnect', () => {
        if (generation !== this.generation || this.gateway !== gateway || this.state === 'stopped') return;
        this.pending.clear(); this.activeSessions.clear();
        this.state = 'error'; this.error = '與 Agent 的連接已中斷。已送出的任務不會自動重送。'; this.publishStatus();
      });
      await gateway.connect();
      if (generation !== this.generation || exited) { gateway.close(); throw new Error('啟動已取消。'); }
      this.state = 'ready'; this.publishStatus(); return this.status();
    } catch (error) {
      if (generation === this.generation) {
        const gateway = this.gateway; this.gateway = null; gateway?.close();
        this.state = 'error'; this.error = error.message;
        if (!exited) child.kill('SIGTERM');
        this.publishStatus();
      }
      throw error;
    }
  }

  async request(method, params = {}) {
    if (!METHODS.has(method)) throw new Error('此介面不支援這個 Agent 操作。');
    if (this.state !== 'ready' || !this.gateway) throw new Error('請先連接 Hermes。');
    if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('請求格式不正確。');
    if (method === 'session.create') params = { ...params, cwd: this.workspace, cwd_explicit: true, source: 'cognitive-workbench' };
    if (method === 'session.resume') params = { ...params, source: 'cognitive-workbench' };
    if (method === 'prompt.submit') {
      if (typeof params.text !== 'string' || !params.text.trim() || params.text.length > 32_000) throw new Error('請輸入 32,000 字元以內的訊息。');
      if (typeof params.session_id !== 'string') throw new Error('缺少對話識別碼。');
      if (this.activeSessions.has(params.session_id)) throw new Error('這個對話仍在執行，請等待完成或先中斷。');
      this.activeSessions.add(params.session_id);
    }
    try { return await this.gateway.request(method, params); }
    catch (error) {
      // Timeout is an unknown outcome, not evidence the backend rejected the
      // turn. Keep it busy until complete/interrupt; never retry it implicitly.
      if (method === 'prompt.submit' && error.code !== 'REQUEST_TIMEOUT') this.activeSessions.delete(params.session_id);
      throw error;
    }
  }

  reply(id, method, result) {
    const request = this.pending.get(String(id));
    if (!request || request.method !== method) throw new Error('這個請求已結束或不屬於目前的 Agent。');
    if (method === 'approval' && !['once', 'session', 'always', 'deny'].includes(result.choice)) throw new Error('確認選項無效。');
    if (method === 'clarify' && (!result.answers || typeof result.answers !== 'object' || Array.isArray(result.answers) || Object.values(result.answers).some(answer => typeof answer !== 'string'))) throw new Error('回答格式不正確。');
    const answered = method === 'approval' ? this.gateway?.respondApproval(id, result.choice) : this.gateway?.respond(id, result);
    if (!answered) { this.pending.delete(String(id)); throw new Error('這個請求已結束，沒有重複傳送回答。'); }
    this.pending.delete(String(id));
    return { ok: true };
  }

  async stop() {
    ++this.generation;
    this.state = 'stopped'; this.error = '';
    await this.terminateChild();
    this.publishStatus(); return this.status();
  }

  async terminateChild() {
    if (this.terminationPromise) return this.terminationPromise;
    this.pending.clear(); this.activeSessions.clear();
    const gateway = this.gateway; this.gateway = null; gateway?.close();
    const child = this.child; this.child = null;
    if (child && child.exitCode === null) {
      this.terminationPromise = new Promise(resolveStop => {
        const timer = setTimeout(() => { child.kill('SIGKILL'); resolveStop(); }, 3000);
        child.once('exit', () => { clearTimeout(timer); resolveStop(); });
        child.kill('SIGTERM');
      }).finally(() => { this.terminationPromise = null; });
      return this.terminationPromise;
    }
  }
}
