import { formatCard, parseCard, RANKS } from "./cards";
import { ALL_COMBOS, comboIndex, comboIndicesForLabel, gridCells, Range } from "./combos";

/** Explicit combos, labels, fixed-high-card intervals and + notation. Last token wins. */
export function parseRangeText(text: string): Range {
  const range = new Range();
  if (!text.trim()) return range;
  for (const token of text.trim().split(/[\s,;]+/)) {
    const parts = token.split(":");
    const raw = parts[0];
    const value = parts[1]?.replace(/%$/, "");
    const weight = value === undefined ? 1 : Number(value) / 100;
    if (parts.length > 2 || value === "" || !Number.isFinite(weight) || weight < 0 || weight > 1) {
      throw new Error(`Некорректный вес: ${token}. Используйте :50 или :50%.`);
    }
    if (/^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/i.test(raw)) {
      const a = parseCard(raw.slice(0, 2)), b = parseCard(raw.slice(2));
      if (a === b) throw new Error(`Одна карта дважды: ${raw}`);
      range.weights[comboIndex(a, b)] = weight;
      continue;
    }
    const label = (s: string) => {
      if (!/^(?:([2-9TJQKA])\1|[2-9TJQKA][2-9TJQKA][so])$/i.test(s)) throw new Error(`Неизвестная рука: ${s}`);
      const hi = RANKS.indexOf(s[0].toUpperCase() as typeof RANKS[number]);
      const lo = RANKS.indexOf(s[1].toUpperCase() as typeof RANKS[number]);
      if (hi < lo || (hi === lo && s.length !== 2)) throw new Error(`Некорректная рука: ${s}`);
      return { hi, lo, suffix: s.slice(2).toLowerCase() };
    };
    const endpoints = raw.replace(/\+$/, "").split("-");
    if (endpoints.length > 2 || (raw.endsWith("+") && endpoints.length > 1)) throw new Error(`Некорректный интервал: ${raw}`);
    const start = label(endpoints[0]);
    const pair = start.hi === start.lo;
    const end = endpoints[1] ? label(endpoints[1]) : raw.endsWith("+")
      ? { hi: pair ? 12 : start.hi, lo: pair ? 12 : start.hi - 1, suffix: start.suffix }
      : start;
    if (start.suffix !== end.suffix || pair !== (end.hi === end.lo) || (!pair && start.hi !== end.hi)) {
      throw new Error(`Интервал должен иметь общий старший ранг и тип: ${raw}`);
    }
    for (let r = Math.min(start.lo, end.lo); r <= Math.max(start.lo, end.lo); r++) {
      range.setHand(`${RANKS[pair ? r : start.hi]}${RANKS[r]}${start.suffix}`, weight);
    }
  }
  return range;
}

/** Lossless round trip, including suit-specific weights from filters. */
export function formatRangeText(range: Range): string {
  const out: string[] = [];
  const suffix = (w: number) => w === 1 ? "" : `:${w * 100}`;
  for (const { label } of gridCells().flat()) {
    const indices = comboIndicesForLabel(label);
    const w = range.weights[indices[0]];
    if (indices.every((i) => range.weights[i] === w)) {
      if (w > 0) out.push(label + suffix(w));
    } else {
      for (const i of indices) if (range.weights[i] > 0) {
        const [a, b] = ALL_COMBOS[i];
        out.push(formatCard(a) + formatCard(b) + suffix(range.weights[i]));
      }
    }
  }
  return out.join(", ");
}
