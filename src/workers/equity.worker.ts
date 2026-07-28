/// <reference lib="webworker" />
// Web Worker: считает эквити вне UI-потока, чтобы интерфейс не фризил.

import { Range } from "../engine/combos";
import { computeEquity, EquityResult } from "../engine/equity";

export interface EquityRequest {
  rid: number;
  aWeights: Float32Array;
  bWeights: Float32Array;
  board: number[];
  dead: number[];
  samples?: number;
}

export interface EquityResponse {
  rid: number;
  result: EquityResult;
}

self.onmessage = (e: MessageEvent<EquityRequest>) => {
  const { rid, aWeights, bWeights, board, dead, samples } = e.data;
  const a = new Range(aWeights);
  const b = new Range(bWeights);
  const result = computeEquity(a, b, board, { dead, samples });
  const res: EquityResponse = { rid, result };
  (self as unknown as Worker).postMessage(res);
};
