import { useEffect, useMemo, useRef } from "react";
import { gridCells, comboIndicesForLabel, ALL_COMBOS } from "../engine/combos";
import { Card } from "../engine/cards";
import { classifyMade, madeStrength } from "../engine/categorize";
import { useStore, blockerMask } from "../state/store";
import { cellBackground, cellText, presetCellBackground } from "./colors";

const GRID = gridCells();

// Кэш: ярлык → индексы комбо (строится один раз).
const LABEL_COMBOS: Record<string, number[]> = {};
for (const cell of GRID.flat()) LABEL_COMBOS[cell.label] = comboIndicesForLabel(cell.label);

/** Число живых (не заблокированных) комбо ярлыка. */
function liveCount(label: string, mask: bigint): number {
  let n = 0;
  for (const idx of LABEL_COMBOS[label]) {
    const [hi, lo] = ALL_COMBOS[idx];
    if ((mask >> BigInt(hi)) & 1n) continue;
    if ((mask >> BigInt(lo)) & 1n) continue;
    n++;
  }
  return n;
}

/** Средняя сила руки (0..1) на борде по её живым комбо — для heatmap. */
function handStrength(label: string, board: Card[], mask: bigint): number | null {
  let sum = 0;
  let n = 0;
  for (const idx of LABEL_COMBOS[label]) {
    const [hi, lo] = ALL_COMBOS[idx];
    if ((mask >> BigInt(hi)) & 1n) continue;
    if ((mask >> BigInt(lo)) & 1n) continue;
    sum += madeStrength(classifyMade(hi, lo, board));
    n++;
  }
  return n === 0 ? null : sum / n;
}

/** Цвет heatmap по силе 0..1: красный (слабо) → жёлтый → зелёный (сильно). */
function heatColor(s: number): string {
  const hue = s * 130; // 0=красный, 130=зелёный
  return `hsl(${hue}, 62%, ${26 + s * 20}%)`;
}

export function HandMatrix() {
  const activeSide = useStore((s) => s.activeSide);
  const range = useStore((s) => s.ranges[activeSide]);
  useStore((s) => s.rev); // подписка на изменения диапазона
  const brushWeight = useStore((s) => s.brushWeight);
  const setHandWeight = useStore((s) => s.setHandWeight);
  const displayMode = useStore((s) => s.displayMode);
  const heatmap = useStore((s) => s.heatmap);
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const presetColorMode = useStore((s) => s.presetColorMode);
  const presetView = useStore((s) => s.presetView[activeSide]);

  const mask = useMemo(() => blockerMask({ heroCards, board }), [heroCards, board]);
  const boardCards = useMemo(() => board.filter((c): c is Card => c !== null), [board]);
  const heatOn = heatmap && boardCards.length >= 3;

  // Состояние драга: активен ли и режим (красим/стираем).
  const drag = useRef<{ active: boolean; erase: boolean }>({ active: false, erase: false });

  useEffect(() => {
    const up = () => (drag.current.active = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const apply = (label: string, erase: boolean) => {
    setHandWeight(label, erase ? 0 : brushWeight);
  };

  const onDown = (label: string) => {
    // Если ячейка уже на текущем весе кисти — стираем, иначе красим.
    const erase = Math.abs(range.handWeight(label) - brushWeight) < 0.001 && range.handWeight(label) > 0;
    drag.current = { active: true, erase };
    apply(label, erase);
  };

  const onEnter = (label: string) => {
    if (drag.current.active) apply(label, drag.current.erase);
  };

  return (
    <div
      className="grid select-none gap-[3px]"
      style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
    >
      {GRID.flat().map((cell) => {
        const w = range.handWeight(cell.label);
        const count = liveCount(cell.label, mask);
        const blocked = count === 0;
        const pct = Math.round(w * 100);

        // Heatmap: красим руки в диапазоне по силе на борде.
        // «Цвета пресета»: красим по действию (колл/3бет/4бет-пуш и т.д.)
        // вместо типа руки — приоритет ниже heatmap, но выше дефолта.
        const segments = presetView?.get(cell.label);
        let bg =
          presetColorMode && segments
            ? presetCellBackground(segments)
            : cellBackground(cell.type, w);
        let txt = cellText(w);
        if (heatOn && w > 0 && !blocked) {
          const s = handStrength(cell.label, boardCards, mask);
          if (s !== null) {
            bg = heatColor(s);
            txt = "#0a0e0d";
          }
        }

        let sub = "";
        if (displayMode === "count") sub = String(count);
        else if (displayMode === "pct") sub = w > 0 ? `${pct}%` : "";
        else sub = w > 0 ? `${pct}% · ${count}` : String(count);

        return (
          <button
            key={cell.label}
            onMouseDown={() => onDown(cell.label)}
            onMouseEnter={() => onEnter(cell.label)}
            className="relative flex aspect-square flex-col items-center justify-center rounded-[3px] text-[10px] font-semibold leading-none transition-[background] duration-75"
            style={{
              background: bg,
              color: txt,
              opacity: blocked ? 0.35 : 1,
            }}
            title={cell.label}
          >
            <span className="text-[11px]">{cell.label}</span>
            {sub && <span className="mt-[2px] text-[8px] opacity-80">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
