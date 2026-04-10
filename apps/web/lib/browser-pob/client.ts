export type BrowserPobWorkerMessage =
  | { type: "ready" }
  | { type: "pending"; pending: boolean }
  | { type: "log"; message: string }
  | { type: "status"; payload: unknown }
  | { type: "metrics"; payload: unknown }
  | { type: "manifest"; payload: unknown }
  | { type: "response"; id: number; ok: boolean; result?: unknown; error?: string };

type EventHandler = (message: BrowserPobWorkerMessage) => void;

export class BrowserPobClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private nextRequestId = 1;

  constructor(private readonly onEvent?: EventHandler) {
    this.worker = new Worker(new URL("../../workers/pob-runtime.worker.js", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", (event: MessageEvent<BrowserPobWorkerMessage>) => {
      const message = event.data;
      if (message?.type === "response") {
        const request = this.pending.get(message.id);
        if (!request) {
          return;
        }

        this.pending.delete(message.id);
        if (message.ok) {
          request.resolve(message.result ?? null);
        } else {
          request.reject(new Error(message.error ?? "Worker request failed"));
        }
        return;
      }

      this.onEvent?.(message);
    });
  }

  request<T>(command: string, payload: Record<string, unknown> = {}) {
    const id = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.worker.postMessage({
        type: "request",
        id,
        command,
        payload,
      });
    });
  }

  dispose() {
    for (const request of this.pending.values()) {
      request.reject(new Error("Worker disposed"));
    }
    this.pending.clear();
    this.worker.terminate();
  }
}
