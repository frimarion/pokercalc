// Состояние вкладки «История рук»: база раздач и ход импорта.
//
// Отдельный стор, а не поля в общем: у разбора истории нет ничего общего с
// диапазонами, а держать в одном объекте тысячи раздач и Float32Array весов
// означало бы дёргать подписчиков матрицы на каждый импорт.

import { create } from "zustand";
import { Hand } from "../hh/types";
import { allHands, clearHands, putHands } from "../hh/db";
import type { ImportRequest, ImportResponse } from "../workers/hh.worker";

export interface ImportProgress {
  done: number;
  total: number;
  label: string;
}

export interface ImportSummary {
  added: number;
  duplicates: number;
  files: number;
}

interface HhState {
  hands: Hand[];
  /** Первичная загрузка базы из IndexedDB. */
  loading: boolean;
  progress: ImportProgress | null;
  /** Итог последнего импорта — показывается до следующего действия. */
  last: ImportSummary | null;
  error: string | null;

  load: () => Promise<void>;
  importFiles: (files: File[]) => Promise<void>;
  clear: () => Promise<void>;
  dismiss: () => void;
}

let worker: Worker | null = null;
let rid = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/hh.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

export const useHhStore = create<HhState>((set, get) => ({
  hands: [],
  loading: false,
  progress: null,
  last: null,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      set({ hands: await allHands(), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  importFiles: async (files) => {
    if (files.length === 0 || get().progress) return;
    set({ progress: { done: 0, total: files.length, label: "Чтение файлов" }, error: null, last: null });

    try {
      const payload = await Promise.all(
        files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })),
      );
      const id = ++rid;
      const w = getWorker();

      const result = await new Promise<Extract<ImportResponse, { kind: "done" }>>((resolve, reject) => {
        w.onmessage = (e: MessageEvent<ImportResponse>) => {
          const msg = e.data;
          if (msg.rid !== id) return; // ответ от отменённого импорта
          if (msg.kind === "progress") {
            set({ progress: { done: msg.done, total: msg.total, label: msg.label } });
          } else if (msg.kind === "done") resolve(msg);
          else reject(new Error(msg.message));
        };
        w.onerror = (e) => reject(new Error(e.message || "Воркер импорта упал"));
        const req: ImportRequest = { rid: id, files: payload };
        // ArrayBuffer'ы передаются владением: копировать мегабайты незачем.
        w.postMessage(req, payload.map((p) => p.buffer));
      });

      set({ progress: { done: result.files, total: result.files, label: "Сохранение" } });
      const saved = await putHands(result.hands);
      set({
        hands: await allHands(),
        progress: null,
        last: { ...saved, files: result.files },
      });
    } catch (e) {
      set({ progress: null, error: e instanceof Error ? e.message : String(e) });
    }
  },

  clear: async () => {
    await clearHands();
    set({ hands: [], last: null, error: null });
  },

  dismiss: () => set({ last: null, error: null }),
}));
