import { useMemo, useState } from "react";
import { Card } from "../engine/cards";
import { Range } from "../engine/combos";
import {
  breakdownRange,
  filterRange,
  MADE_ORDER,
  DRAW_ORDER,
  MadeCategory,
  DrawType,
} from "../engine/categorize";
import { useStore, blockerMask } from "../state/store";

const MADE_LABELS: Record<MadeCategory, string> = {
  "straight-flush": "Стрит-флеш",
  quads: "Каре",
  "full-house": "Фулхаус",
  flush: "Флеш",
  straight: "Стрит",
  "set-trips": "Сет / Трипс",
  "two-pair": "Две пары",
  overpair: "Оверпара",
  "top-pair": "Топ-пара",
  "middle-pair": "Средняя пара",
  "weak-pair": "Слабая пара",
  underpair: "Андерпара",
  "no-pair": "Нет пары / оверкарты",
};

const DRAW_LABELS: Record<DrawType, string> = {
  "flush-draw": "Флеш-дро",
  oesd: "Стрит-дро (OESD)",
  gutshot: "Гатшот",
  bdfd: "Бэкдор флеш-дро",
};

function fmt(n: number): string {
  return Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
}

function Row({
  label,
  count,
  total,
  accent,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 rounded px-1 py-[3px] text-left text-xs transition ${
        selected ? "bg-emerald-500/15 ring-1 ring-emerald-500/40" : "hover:bg-white/5"
      }`}
      title="Клик — выбрать для морфинга"
    >
      <span className="w-4 shrink-0 text-center text-[10px]">{selected ? "📌" : ""}</span>
      <span className="w-28 shrink-0 text-neutral-300">{label}</span>
      <span className="w-8 shrink-0 text-right tabular-nums text-neutral-400">{fmt(count)}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums text-neutral-500">
        {pct.toFixed(0)}%
      </span>
    </button>
  );
}

export function MadeBreakdown() {
  const activeSide = useStore((s) => s.activeSide);
  const range = useStore((s) => s.ranges[activeSide]);
  const rev = useStore((s) => s.rev);
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const morphActiveRange = useStore((s) => s.morphActiveRange);

  const [selMade, setSelMade] = useState<Set<MadeCategory>>(new Set());
  const [selDraws, setSelDraws] = useState<Set<DrawType>>(new Set());

  const boardCards = useMemo(() => board.filter((c): c is Card => c !== null), [board]);
  const mask = useMemo(() => blockerMask({ heroCards, board }), [heroCards, board]);

  const bd = useMemo(
    () => breakdownRange(range, boardCards, mask),
    [range, boardCards, mask, rev],
  );

  // Предпросмотр: сколько комбо останется после морфинга по выбору.
  const previewCount = useMemo(() => {
    if (selMade.size === 0 && selDraws.size === 0) return 0;
    const w = filterRange(range, boardCards, mask, selMade, selDraws);
    return new Range(w).totalCombos(mask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, boardCards, mask, rev, selMade, selDraws]);

  if (boardCards.length < 3) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-[#0d1210] p-4 text-sm text-neutral-500">
        <div className="mb-1 font-semibold text-neutral-400">MADE — разбор борда</div>
        Поставь флоп (3 карты), чтобы увидеть разбивку и морфинг диапазона.
      </div>
    );
  }

  const madeRows = MADE_ORDER.filter((k) => bd.made[k] > 0.001);
  const drawRows = DRAW_ORDER.filter((k) => bd.draws[k] > 0.001);
  const hasSel = selMade.size > 0 || selDraws.size > 0;

  const toggleMade = (k: MadeCategory) =>
    setSelMade((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const toggleDraw = (k: DrawType) =>
    setSelDraws((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const apply = () => {
    morphActiveRange([...selMade], [...selDraws]);
    setSelMade(new Set());
    setSelDraws(new Set());
  };
  const clearSel = () => {
    setSelMade(new Set());
    setSelDraws(new Set());
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1614] p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Made · {activeSide === "hero" ? "Hero" : "Villain"}
        </span>
        <span className="text-[11px] text-neutral-500">{fmt(bd.total)} комбо</span>
      </div>
      <div>
        {madeRows.map((k) => (
          <Row
            key={k}
            label={MADE_LABELS[k]}
            count={bd.made[k]}
            total={bd.total}
            accent="#34c77b"
            selected={selMade.has(k)}
            onToggle={() => toggleMade(k)}
          />
        ))}
      </div>

      {drawRows.length > 0 && (
        <>
          <div className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Дро
          </div>
          <div>
            {drawRows.map((k) => (
              <Row
                key={k}
                label={DRAW_LABELS[k]}
                count={bd.draws[k]}
                total={bd.total}
                accent="#f59e0b"
                selected={selDraws.has(k)}
                onToggle={() => toggleDraw(k)}
              />
            ))}
          </div>
        </>
      )}

      {/* Морфинг */}
      <div className="mt-3 border-t border-white/10 pt-3">
        {hasSel ? (
          <div className="flex items-center gap-2">
            <button
              onClick={apply}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
            >
              📌 Оставить выбранное ({fmt(previewCount)} комбо)
            </button>
            <button
              onClick={clearSel}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:bg-white/5"
            >
              Сброс
            </button>
          </div>
        ) : (
          <p className="text-[10px] leading-snug text-neutral-600">
            Клик по категории — выбрать. Затем «оставить выбранное» сузит{" "}
            {activeSide === "hero" ? "диапазон Hero" : "диапазон Villain"} до этих рук (морфинг по улице).
          </p>
        )}
      </div>
    </div>
  );
}
