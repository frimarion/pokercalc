/// <reference lib="webworker" />
// Web Worker: решатель пуш-фолда по ICM. На девяти игроках это ~секунда
// счёта — на главном потоке поля ввода замирали бы на каждой правке стека.

import { PushFoldInput, PushFoldResult, solvePushFold } from "../icm/pushfold";

export interface IcmRequest {
  rid: number;
  input: PushFoldInput;
}

export type IcmResponse =
  | { rid: number; kind: "done"; result: PushFoldResult; ms: number }
  | { rid: number; kind: "error"; message: string };

self.onmessage = (e: MessageEvent<IcmRequest>) => {
  const { rid, input } = e.data;
  const post = (msg: IcmResponse) => (self as unknown as Worker).postMessage(msg);
  try {
    const t0 = performance.now();
    const result = solvePushFold(input);
    post({ rid, kind: "done", result, ms: performance.now() - t0 });
  } catch (err) {
    post({ rid, kind: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
