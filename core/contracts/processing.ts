/**
 * Version 1 設計契約：L2 → L3 任務／事件，以及 L3 → L4 結構化結果。
 * 目前 Hermes 診斷接線尚未實作此介面；本檔不代表 nanobot 已受支援。
 * 純型別，無執行邏輯、SDK 或供應商協定。ID 由工作台管理，時間使用 ISO 8601。
 */

export type Revision = string;
export type DataRef = Readonly<{ id: string; revision: Revision }>;
export type AttachmentRef = Readonly<{ id: string; mediaType?: string; sha256?: string }>;

/** 原始輸入保持不變；空白、附件有效性及來源權限由 L2／L4 驗證。 */
export type InputEnvelope = Readonly<{
  inputId: string;
  source: Readonly<{ id: string; externalId?: string }>;
  original:
    | Readonly<{ text: string; attachments?: readonly AttachmentRef[] }>
    | Readonly<{ text?: never; attachments: readonly [AttachmentRef, ...AttachmentRef[]] }>;
  times: Readonly<{ capturedAt: string; occurredAt?: string; receivedAt?: string }>;
}>;

export interface ProcessingTask {
  readonly taskId: string;
  readonly runId: string;
  readonly inputIds: readonly [string, ...string[]];
  readonly instruction: string;
  readonly contextRefs: readonly DataRef[];
  readonly requestedAt: string;
  /** 同一邏輯提交沿用此鍵；更換引擎或重試不得默默重做副作用。 */
  readonly idempotencyKey: string;
}

export interface EngineProvenance {
  readonly adapterId: string;
  readonly engineId: string;
  readonly engineVersion?: string;
  readonly modelId?: string;
  readonly configurationRef?: DataRef;
}

export interface EvidenceRef {
  readonly evidenceId: string;
  readonly source: Readonly<{ inputId: string; attachmentId?: string }> | DataRef;
  readonly locator?: string;
  readonly excerpt?: string;
}

/** kind/schemaVersion 可擴充；data 是待驗證的建議，不是可信資料或寫入命令。 */
export interface CandidateContent {
  readonly candidateId: string;
  readonly origin: 'agent-proposal';
  readonly kind: string;
  readonly schemaVersion: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly evidenceIds: readonly string[];
}

export interface ProcessingResult {
  readonly resultId: string;
  readonly taskId: string;
  readonly runId: string;
  readonly inputIds: readonly [string, ...string[]];
  readonly engine: EngineProvenance;
  readonly contextRefs: readonly DataRef[];
  readonly evidence: readonly EvidenceRef[];
  readonly uncertainties: readonly Readonly<{
    description: string;
    candidateIds?: readonly string[];
    needsUserReview: boolean;
  }>[];
  readonly candidates: readonly CandidateContent[];
  readonly producedAt: string;
}

export interface RunReceipt {
  readonly taskId: string;
  readonly runId: string;
  readonly engine: EngineProvenance;
  readonly acceptedAt: string;
}

type EventIdentity = Readonly<{
  eventId: string;
  taskId: string;
  runId: string;
  sequence: number;
  occurredAt: string;
}>;

/**
 * result.proposed 只代表候選結果產生；文字回覆與此事件都不代表 L4 已儲存。
 * completed／failed／cancelled 是執行終態，每個 run 只能有一個；completed 仍非保存回執。
 */
export type ProcessingEvent = EventIdentity & (
  | Readonly<{ type: 'run.started' }>
  | Readonly<{ type: 'run.progress'; message: string }>
  | Readonly<{ type: 'result.proposed'; result: ProcessingResult }>
  | Readonly<{ type: 'run.completed' }>
  | Readonly<{ type: 'run.failed'; code: string; message: string }>
  | Readonly<{ type: 'run.cancelled'; reason?: string }>
);

/**
 * L3 只處理任務並產生候選結果，不取得 L4 的任意寫入能力。
 * L2 註冊適配器時驗證：宣告 cancellation=true 必須實作 cancel。
 */
export interface AgentAdapter {
  readonly id: string;
  readonly capabilities: Readonly<{
    inputKinds: readonly ('text' | 'attachment')[];
    outputKinds: readonly string[];
    cancellation: boolean;
    eventReplay: boolean;
  }>;
  health(): Promise<Readonly<{ status: 'ready' | 'degraded' | 'unavailable'; detail?: string }>>;
  /** 回執沿用 taskId/runId；inputs 對應 inputIds，contextRefs 透過經授權的能力解析。 */
  submit(task: ProcessingTask, inputs: readonly InputEnvelope[]): Promise<RunReceipt>;
  /**
   * 不支援重播或 cursor 無效時明確報錯；串流斷線不等於結束，不可默默重送。
   * 無重播時的狀態查詢／恢復協議尚待實作；L2 必須保留未知狀態。
   */
  events(runId: string, afterEventId?: string): AsyncIterable<ProcessingEvent>;
  /** accepted 只表示取消請求被接收；必須取得 run.cancelled 才能顯示已取消。 */
  cancel?(runId: string): Promise<Readonly<{ accepted: boolean }>>;
}

export interface WriteConditions {
  /** L4 定義的寫入範圍；去重鍵及 revision 均以此範圍判定。 */
  readonly scopeId: string;
  readonly deduplicationKey: string;
  readonly baseRevision: Revision | null;
}

export type WriteOutcome<T> =
  | Readonly<{ status: 'committed' | 'duplicate'; value: T; revision: Revision }>
  | Readonly<{ status: 'conflict'; reason: 'revision-mismatch' | 'deduplication-key-reused'; currentRevision: Revision | null }>
  | Readonly<{ status: 'rejected'; code: string; message: string }>;

/**
 * L4 實作驗證、去重、原子提交與 revision 比對；相同鍵不同內容必須回 conflict。
 * saveInput 保存原始輸入；commitResult 保存具來源的派生候選，不覆寫原文或主觀量表。
 * 只有 committed／duplicate 證實資料存在。LLM 回覆、RunReceipt、候選事件皆非提交成功。
 * L4 須核對 input/task/run 關聯、證據參照、候選 schema 及人工審閱要求後才接受結果。
 */
export interface ResultStore {
  saveInput(command: WriteConditions & Readonly<{ input: InputEnvelope }>): Promise<WriteOutcome<Readonly<{ inputId: string }>>>;
  commitResult(command: WriteConditions & Readonly<{ result: ProcessingResult }>): Promise<WriteOutcome<Readonly<{ resultId: string }>>>;
}
