import { useMemo, useState } from "react";
import { Hand } from "../hh/types";
import {
  analyzeDeviations,
  summarizeDecisions,
  DEVIATIONS,
  SPOT_LABELS,
  SpotKind,
  Verdict,
  VERDICT_LABELS,
} from "../hh/deviations";
import { gridCells } from "../engine/combos";
import { useStore } from "../state/store";
import { HandLogView } from "./HandLogView";

const GRID = gridCells();

const VERDICT_COLOR: Record<Verdict, string> = {
  ok: "text-emerald-400",
  mixed: "text-sky-400",
  loose: "text-amber-400",
  tight: "text-violet-400",
  action: "text-rose-400",
};

const money = (cents: number) => `${cents < 0 ? "−" : ""}$${Math.abs(cents / 100).toFixed(2)}`;

/**
 * Цвет ячейки матрицы по доле отклонений: от нейтрального (всё по чарту) к
 * красному. Насыщенность гасится на малой выборке — одна ошибка из одной руки
 * не должна выглядеть как системная дыра.
 */
function cellColor(deviations: number, total: number): string {
  if (total === 0) return "rgb(22, 25, 24)";
  const rate = deviations / total;
  if (rate === 0) return "rgb(24, 38, 31)";
  const confidence = Math.min(1, total / 8);
  const alpha = 0.2 + rate * confidence * 0.8;
  return `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
}

function Bar({ counts, total }: { counts: Record<Verdict, number>; total: number }) {
  const order: Verdict[] = ["ok", "mixed", "loose", "tight", "action"];
  const bg: Record<Verdict, string> = {
    ok: "#22c07b",
    mixed: "#38bdf8",
    loose: "#f59e0b",
    tight: "#a855f7",
    action: "#ef4444",
  };
  return (
    <div className="flex h-1.5 overflow-hidden rounded bg-white/5">
      {order.map((v) =>
        counts[v] === 0 ? null : (
          <div
            key={v}
            title={`${VERDICT_LABELS[v]}: ${counts[v]}`}
            style={{ width: `${(counts[v] / total) * 100}%`, background: bg[v] }}
          />
        ),
      )}
    </div>
  );
}

/** Сверка префлопа с Green Charts: по спотам, по рукам и разбор раздач. */
export function HandsDeviations({ hands }: { hands: Hand[] }) {
  const [fullRingOnly, setFullRingOnly] = useState(false);
  const [kind, setKind] = useState<SpotKind | "all">("all");
  /** Фильтр по конкретной руке — ставится кликом по ячейке матрицы. */
  const [handLabel, setHandLabel] = useState<string | null>(null);
  const [onlyDeviations, setOnlyDeviations] = useState(true);
  /** Выбранное решение: handId + индекс действия однозначно его задают. */
  const [selected, setSelected] = useState<{ handId: string; actionIndex: number } | null>(null);
  const applyPreset = useStore((s) => s.applyPreset);

  const report = useMemo(() => analyzeDeviations(hands), [hands]);
  const byId = useMemo(() => new Map(hands.map((h) => [h.id, h])), [hands]);

  const decisions = useMemo(
    () =>
      report.decisions.filter(
        (d) => (!fullRingOnly || d.fullRing) && (kind === "all" || d.kind === kind),
      ),
    [report, fullRingOnly, kind],
  );

  const view = useMemo(() => summarizeDecisions(decisions), [decisions]);

  // Список для разбора: сначала самые дорогие. Отклонения по умолчанию, но
  // можно посмотреть и решения по чарту — иногда важно убедиться, что
  // «правильное» решение и правда было тем, за которое его принял разбор.
  const listed = useMemo(
    () =>
      decisions
        .filter((d) => !onlyDeviations || DEVIATIONS.includes(d.verdict))
        .filter((d) => handLabel === null || d.label === handLabel)
        .sort((a, b) => a.net - b.net),
    [decisions, onlyDeviations, handLabel],
  );

  const current = useMemo(
    () =>
      selected
        ? listed.find((d) => d.handId === selected.handId && d.actionIndex === selected.actionIndex)
        : undefined,
    [listed, selected],
  );

  if (report.decisions.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        Ни одно решение не легло на оцифрованные чарты. Обычно это значит, что в базе только
        лимпед-поты и мультивей-споты.
      </div>
    );
  }

  const deviations = DEVIATIONS.reduce((n, v) => n + view.totals[v], 0);
  const rate = decisions.length === 0 ? 0 : (deviations / decisions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0f1513] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Вне чарта</div>
          <div
            className={`mt-1 text-xl font-black ${rate > 10 ? "text-rose-400" : rate > 5 ? "text-amber-400" : "text-emerald-400"}`}
          >
            {rate.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-500">
            {deviations} из {decisions.length} решений
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["all", ...report.byKind.map((k) => k.kind)] as (SpotKind | "all")[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                kind === k
                  ? "bg-emerald-500 text-black"
                  : "border border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {k === "all" ? "Все споты" : SPOT_LABELS[k]}
            </button>
          ))}
        </div>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={fullRingOnly}
            onChange={(e) => setFullRingOnly(e.target.checked)}
            className="accent-emerald-500"
          />
          только полные столы (6 игроков)
        </label>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          По спотам
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Спот</th>
                <th className="px-3 py-2 text-left font-semibold">Чарт</th>
                <th className="px-3 py-2 text-right font-semibold">Решений</th>
                <th className="px-3 py-2 text-right font-semibold">Вне чарта</th>
                <th className="w-32 px-3 py-2 text-left font-semibold">Разбивка</th>
                <th className="px-3 py-2 text-right font-semibold">Итог</th>
              </tr>
            </thead>
            <tbody>
              {view.bySpot.map((s) => (
                <tr key={`${s.kind}|${s.spot}|${s.presetId}`} className="border-t border-white/5">
                  <td className="px-3 py-2">{s.spot}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => applyPreset(s.presetId, true)}
                      title="Показать чарт в матрице на вкладке «Диапазоны»"
                      className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-neutral-400 hover:bg-white/5"
                    >
                      {s.presetId}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-400">{s.total}</td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      s.deviationPct > 10 ? "text-rose-400" : s.deviationPct > 5 ? "text-amber-400" : ""
                    }`}
                  >
                    {s.deviationPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    <Bar counts={s.counts} total={s.total} />
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${s.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {money(s.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Где отклоняетесь
          </h3>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
            {GRID.flat().map((cell) => {
              const c = view.byHand.get(cell.label);
              const total = c?.total ?? 0;
              const dev = c?.deviations ?? 0;
              const active = handLabel === cell.label;
              return (
                <button
                  key={cell.label}
                  disabled={total === 0}
                  onClick={() => {
                    setHandLabel(active ? null : cell.label);
                    setSelected(null);
                  }}
                  title={
                    total === 0
                      ? `${cell.label}: не встречалась`
                      : `${cell.label}: ${dev} из ${total} вне чарта — нажмите, чтобы отобрать раздачи`
                  }
                  className={`flex aspect-square flex-col items-center justify-center rounded-[3px] text-[10px] font-semibold leading-none transition ${
                    active ? "ring-2 ring-inset ring-emerald-400" : ""
                  } ${total > 0 ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
                  style={{
                    background: cellColor(dev, total),
                    color: total === 0 ? "#4b5551" : "#e7ece9",
                  }}
                >
                  <span className="text-[10px]">{cell.label}</span>
                  {dev > 0 && <span className="mt-[1px] text-[8px] opacity-80">{dev}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-neutral-600">
            Чем краснее рука, тем чаще вы играли её не так, как чарт. Насыщенность гасится на малой
            выборке: одна ошибка на одной раздаче — ещё не тенденция. Нажмите на руку, чтобы
            отобрать её раздачи.
          </p>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {onlyDeviations ? "Отклонения" : "Решения"} ({listed.length})
            </h3>
            {handLabel && (
              <button
                onClick={() => {
                  setHandLabel(null);
                  setSelected(null);
                }}
                className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300"
              >
                {handLabel} ✕
              </button>
            )}
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
              <input
                type="checkbox"
                checked={onlyDeviations}
                onChange={(e) => {
                  setOnlyDeviations(e.target.checked);
                  setSelected(null);
                }}
                className="accent-emerald-500"
              />
              только отклонения
            </label>
          </div>
          {listed.length === 0 ? (
            <div className="text-sm text-neutral-500">
              {onlyDeviations ? "Отклонений нет — все решения по чарту." : "Решений нет."}
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <tbody>
                  {listed.map((d) => {
                    const active =
                      selected?.handId === d.handId && selected?.actionIndex === d.actionIndex;
                    return (
                      <tr
                        key={`${d.handId}-${d.actionIndex}`}
                        onClick={() =>
                          setSelected(
                            active ? null : { handId: d.handId, actionIndex: d.actionIndex },
                          )
                        }
                        title="Показать лог раздачи"
                        className={`cursor-pointer border-b border-white/5 last:border-0 ${
                          active ? "bg-emerald-400/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <td className="px-3 py-2 font-mono font-bold">{d.label}</td>
                        <td className="px-3 py-2 text-xs text-neutral-400">
                          {d.spot}
                          {d.note && <div className="text-[10px] text-neutral-600">{d.note}</div>}
                        </td>
                        <td className={`px-3 py-2 text-xs font-semibold ${VERDICT_COLOR[d.verdict]}`}>
                          {VERDICT_LABELS[d.verdict]}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${d.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {money(d.net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-neutral-600">
            Нажмите на строку — откроется лог раздачи с подсветкой того самого решения.
          </p>
        </div>
      </section>

      {current && byId.has(current.handId) && (
        <HandLogView
          hand={byId.get(current.handId)!}
          decision={current}
          onClose={() => setSelected(null)}
        />
      )}

      <p className="text-[11px] text-neutral-600">
        Не сверено {report.unmatched} раздач: лимпед-поты, сквизы и 4бет+ — для них чарты Green
        Charts не оцифрованы. «Смешанная» отклонением не считается: чарт играет такую руку и так, и
        иначе.
      </p>
    </div>
  );
}
