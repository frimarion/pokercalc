/// <reference lib="webworker" />
// Web Worker: импорт истории рук.
//
// Здесь делается всё дорогое — распаковка архивов, парсинг и расчёт эквити
// префлоп-олл-инов (Monte Carlo, десятки миллисекунд на раздачу). На главном
// потоке это подвесило бы интерфейс на секунды, а прогресс-бар не двигался бы
// именно тогда, когда он нужнее всего.

import { parseHandHistory } from "../hh/parse";
import { withAllIn } from "../hh/allinEv";
import { textsFrom } from "../hh/zip";
import { Hand } from "../hh/types";

export interface ImportRequest {
  rid: number;
  files: { name: string; buffer: ArrayBuffer }[];
}

export type ImportResponse =
  | { rid: number; kind: "progress"; done: number; total: number; label: string }
  | { rid: number; kind: "done"; hands: Hand[]; files: number }
  | { rid: number; kind: "error"; message: string };

const post = (msg: ImportResponse) => (self as unknown as Worker).postMessage(msg);

self.onmessage = async (e: MessageEvent<ImportRequest>) => {
  const { rid, files } = e.data;
  try {
    // Сначала распаковываем всё: только после этого известно, сколько
    // текстовых файлов на самом деле придётся разобрать.
    const texts: { name: string; text: string }[] = [];
    for (const f of files) {
      post({ rid, kind: "progress", done: 0, total: files.length, label: `Распаковка ${f.name}` });
      texts.push(...(await textsFrom(f.name, f.buffer)));
    }

    const hands: Hand[] = [];
    for (let i = 0; i < texts.length; i++) {
      post({ rid, kind: "progress", done: i, total: texts.length, label: texts[i].name });
      for (const h of parseHandHistory(texts[i].text)) hands.push(withAllIn(h));
    }
    post({ rid, kind: "done", hands, files: texts.length });
  } catch (err) {
    post({ rid, kind: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
