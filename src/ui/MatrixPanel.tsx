import { useMemo } from "react";
import { useStore, blockerMask, Side } from "../state/store";
import { HandType } from "../engine/combos";
import { HandMatrix } from "./HandMatrix";
import { ActionTree } from "./ActionTree";
import { handTypeColor, actionColorCss } from "./colors";

const BRUSHES = [0.25, 0.5, 0.75, 1];

const LEGEND: { type: HandType; label: string }[] = [
  { type: "pair", label: "пары" },
  { type: "suited", label: "suited" },
  { type: "offsuit", label: "offsuit" },
];

const SIDE_META: Record<Side, { label: string; active: string }> = {
  hero: { label: "Hero", active: "bg-emerald-600 text-white" },
  villain: { label: "Villain", active: "bg-sky-600 text-white" },
};

export function MatrixPanel() {
  const activeSide = useStore((s) => s.activeSide);
  const setActiveSide = useStore((s) => s.setActiveSide);
  const ranges = useStore((s) => s.ranges);
  useStore((s) => s.rev);
  const brushWeight = useStore((s) => s.brushWeight);
  const setBrush = useStore((s) => s.setBrush);
  const clearRange = useStore((s) => s.clearRange);
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const presetColorMode = useStore((s) => s.presetColorMode);
  const legend = useStore((s) => s.presetLegend[activeSide]);
  const presetLegend = presetColorMode ? legend : null;

  const mask = useMemo(() => blockerMask({ heroCards, board }), [heroCards, board]);

  return (
    <div className="flex flex-col gap-3">
      {/* Табы стороны */}
      <div className="flex items-center gap-2">
        {(["hero", "villain"] as Side[]).map((side) => {
          const combos = ranges[side].totalCombos(mask);
          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSide === side
                  ? SIDE_META[side].active
                  : "border border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {SIDE_META[side].label}
              <span className="ml-2 text-xs opacity-70">{combos.toFixed(0)}</span>
            </button>
          );
        })}
      </div>

      <ActionTree />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">
            Кисть
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {presetLegend ? (
              // В режиме «цвета пресета» подписи берутся из действий чарта,
              // поэтому легенда всегда соответствует текущему споту.
              presetLegend.map(({ color, label }) => (
                <span key={color} className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <i
                    className="inline-block h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: actionColorCss(color) }}
                  />
                  {label}
                </span>
              ))
            ) : (
              LEGEND.map(({ type, label }) => (
                <span key={type} className="flex items-center gap-1 text-[10px] text-neutral-500">
                  <i
                    className="inline-block h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: handTypeColor(type) }}
                  />
                  {label}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {BRUSHES.map((w) => (
            <button
              key={w}
              onClick={() => setBrush(w)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                Math.abs(brushWeight - w) < 0.001
                  ? "bg-emerald-500 text-black"
                  : "border border-white/10 text-neutral-300 hover:bg-white/5"
              }`}
            >
              {w * 100}%
            </button>
          ))}
          <button
            onClick={clearRange}
            className="ml-1 rounded-md border border-white/10 px-2.5 py-1 text-xs text-rose-400 hover:bg-white/5"
          >
            Очистить
          </button>
        </div>
      </div>
      <HandMatrix />
    </div>
  );
}
