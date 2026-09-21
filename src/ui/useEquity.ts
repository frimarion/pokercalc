import { useEffect, useState } from "react";
import { Card } from "../engine/cards";
import { Range } from "../engine/combos";
import { EquityResult } from "../engine/equity";
import type { EquityRequest, EquityResponse } from "../workers/equity.worker";

interface EquityState {
  result: EquityResult | null;
  computing: boolean;
  error?: string;
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
  options: { samples?: number; detail?: boolean; nextCards?: boolean } = {},
): EquityState {
  const [state, setState] = useState<EquityState>({ result: null, computing: false });

  useEffect(() => {
    let worker: Worker | undefined;
    let cancelled = false;
    setState({ result: null, computing: true });
    const t = setTimeout(() => {
      worker = new Worker(new URL("../workers/equity.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<EquityResponse>) => {
        if (!cancelled) setState({ result: e.data.result, computing: false });
      };
      worker.onerror = () => {
        if (!cancelled) setState({ result: null, computing: false, error: "Не удалось рассчитать эквити. Измените параметры или повторите расчёт." });
      };
      const req: EquityRequest = {
        rid: 1,
        aWeights: hero.weights.slice(),
        bWeights: villain.weights.slice(),
        board,
        dead,
        samples: options.samples,
        detail: options.detail,
        nextCards: options.nextCards,
      };
      worker.postMessage(req);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); worker?.terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, options.samples, options.detail, options.nextCards]);

  return state;
}
