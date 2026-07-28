import { useEffect, useRef, useState } from "react";
import { Card } from "../engine/cards";
import { Range } from "../engine/combos";
import { EquityResult } from "../engine/equity";
import type { EquityRequest, EquityResponse } from "../workers/equity.worker";

interface EquityState {
  result: EquityResult | null;
  computing: boolean;
}

/**
 * Считает эквити heroSide vs villainSide на борде в Web Worker.
 * signature — строка, меняющаяся при любом релевантном изменении входов
 * (веса диапазонов, борд, мёртвые карты); по ней запускается пересчёт с дебаунсом.
 */
export function useEquity(
  hero: Range,
  villain: Range,
  board: Card[],
  dead: Card[],
  signature: string,
): EquityState {
  const [state, setState] = useState<EquityState>({ result: null, computing: false });
  const workerRef = useRef<Worker | null>(null);
  const ridRef = useRef(0);

  // Один воркер на всё время жизни.
  useEffect(() => {
    const worker = new Worker(new URL("../workers/equity.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<EquityResponse>) => {
      if (e.data.rid !== ridRef.current) return; // устаревший ответ
      setState({ result: e.data.result, computing: false });
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    setState((s) => ({ ...s, computing: true }));
    const t = setTimeout(() => {
      const rid = ++ridRef.current;
      const req: EquityRequest = {
        rid,
        aWeights: hero.weights.slice(),
        bWeights: villain.weights.slice(),
        board,
        dead,
        samples: undefined,
      };
      worker.postMessage(req);
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}
