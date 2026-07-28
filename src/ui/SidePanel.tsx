import { useMemo } from "react";
import { Card } from "../engine/cards";
import {
  useStore,
  currentStreet,
  Street,
  DisplayMode,
} from "../state/store";
import { Range, comboIndex } from "../engine/combos";
import { useEquity } from "./useEquity";
import { MadeBreakdown } from "./MadeBreakdown";

const STREETS: { key: Street; label: string; cards: number }[] = [
  { key: "flop", label: "Флоп", cards: 3 },
  { key: "turn", label: "Тёрн", cards: 4 },
  { key: "river", label: "Ривер", cards: 5 },
];

const MODES: { key: DisplayMode; label: string }[] = [
  { key: "pct", label: "%" },
  { key: "count", label: "#" },
  { key: "both", label: "% + #" },
];

/** Range из одной конкретной руки hero (когда обе карты заданы). */
function singleComboRange(a: Card, b: Card): Range {
  const r = new Range();
  r.weights[comboIndex(a, b)] = 1;
  return r;
}

export function SidePanel() {
  const ranges = useStore((s) => s.ranges);
  const rev = useStore((s) => s.rev);
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const displayMode = useStore((s) => s.displayMode);
  const setDisplayMode = useStore((s) => s.setDisplayMode);
  const heatmap = useStore((s) => s.heatmap);
  const toggleHeatmap = useStore((s) => s.toggleHeatmap);
  const presetColorMode = useStore((s) => s.presetColorMode);
  const togglePresetColorMode = useStore((s) => s.togglePresetColorMode);
  const clearCardAt = useStore((s) => s.clearCardAt);

  const heroSpecific = heroCards[0] !== null && heroCards[1] !== null;
  const boardCards = useMemo(
    () => board.filter((c): c is Card => c !== null),
    [board],
  );
  const street = currentStreet(board);

  // Hero-сторона: конкретная рука (если заданы обе карты) либо диапазон Hero.
  const heroSide = useMemo(
    () =>
      heroSpecific
        ? singleComboRange(heroCards[0] as Card, heroCards[1] as Card)
        : ranges.hero,
    // rev — пересчёт при правке диапазона; heroCards — при смене руки
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heroSpecific, heroCards[0], heroCards[1], ranges.hero, rev],
  );

  const signature = `${rev}|${heroCards.join(",")}|${board.join(",")}`;
  const { result, computing } = useEquity(heroSide, ranges.villain, boardCards, [], signature);

  const truncateTo = (cards: number) => {
    for (let i = cards; i < 5; i++) clearCardAt({ kind: "board", index: i });
  };

  const heroPct = result?.valid ? result.a.equity * 100 : null;
  const villPct = result?.valid ? result.b.equity * 100 : null;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Эквити */}
      <div className="rounded-xl border border-white/10 bg-[#0f1614] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">
            Эквити {heroSpecific ? "руки Hero" : "Hero"} vs Villain
          </span>
          {result?.valid && (
            <span className="text-[10px] text-neutral-600">
              {result.exact ? "точно" : `~MC ${(result.samples / 1000).toFixed(0)}k`}
              {computing && " · …"}
            </span>
          )}
        </div>

        {heroPct === null ? (
          <div className="mt-1">
            <div className="text-4xl font-bold text-neutral-600">—</div>
            <div className="mt-1 text-xs text-neutral-500">
              Задай оба диапазона (или руку Hero + диапазон Villain).
            </div>
          </div>
        ) : (
          <div className={computing ? "opacity-60 transition" : "transition"}>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-emerald-400">
                {heroPct.toFixed(1)}%
              </span>
              <span className="text-lg font-semibold text-sky-400">
                {villPct!.toFixed(1)}%
              </span>
            </div>
            {/* Сплит-бар */}
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
              <div className="bg-emerald-500" style={{ width: `${heroPct}%` }} />
              <div className="bg-sky-500" style={{ width: `${villPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-neutral-500">
              <span>
                Hero: win {(result!.a.win * 100).toFixed(1)}% · tie{" "}
                {(result!.a.tie * 100).toFixed(1)}%
              </span>
              <span>Villain</span>
            </div>
          </div>
        )}
      </div>

      {/* Табы улиц */}
      <div className="grid grid-cols-3 gap-1">
        {STREETS.map((s) => (
          <button
            key={s.key}
            onClick={() => truncateTo(s.cards)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              street === s.key
                ? "bg-emerald-600 text-white"
                : "border border-white/10 text-neutral-400 hover:bg-white/5"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Режимы показа */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Показ</span>
        <div className="flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setDisplayMode(m.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                displayMode === m.key
                  ? "bg-white/15 text-white"
                  : "border border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={toggleHeatmap}
            className={`ml-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              heatmap ? "bg-orange-500 text-black" : "border border-white/10 text-neutral-400 hover:bg-white/5"
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={togglePresetColorMode}
            title="Красить руки по действию пресета (колл/3бет/4бет), а не по типу"
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              presetColorMode
                ? "bg-emerald-500 text-black"
                : "border border-white/10 text-neutral-400 hover:bg-white/5"
            }`}
          >
            Цвета пресета
          </button>
        </div>
      </div>

      {/* MADE-разбор борда */}
      <MadeBreakdown />
    </div>
  );
}
