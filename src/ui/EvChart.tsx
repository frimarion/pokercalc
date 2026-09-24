import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  GraphPoint,
  LINE_KEYS,
  LineKey,
  Unit,
  deltaOn,
  downsample,
  niceTicks,
  valueOf,
} from "../hh/graph";
import { useIsCompact } from "./useMedia";

const LINES: Record<LineKey, { label: string; hint: string; color: string; width: number }> = {
  actual: { label: "Факт", hint: "Фактический выигрыш", color: "#22c07b", width: 2 },
  ev: { label: "EV", hint: "Олл-ины заменены своим EV — выигрыш без учёта раздачи карт", color: "#f59e0b", width: 1.6 },
  sd: { label: "Шоудаун", hint: "Выигрыш в раздачах, дошедших до вскрытия", color: "#38bdf8", width: 1.3 },
  nonSd: { label: "Без шоудауна", hint: "Выигрыш без вскрытия: сбросы, забранные ставкой банки", color: "#f43f5e", width: 1.3 },
};

const M = { left: 52, right: 12, top: 12, bottom: 40 };

function fmt(v: number, unit: Unit, signed = true, digits?: number): string {
  const sign = !signed ? (v < 0 ? "−" : "") : v > 0 ? "+" : v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (unit === "usd") return `${sign}$${(a / 100).toFixed(digits ?? 2)}`;
  return `${sign}${a.toFixed(digits ?? (a >= 100 ? 0 : 1))} bb`;
}

/** Подпись деления: без лишних нулей («$5», «$2.5», «−200»), тысячи bb — «1.2k». */
function axisLabel(v: number, unit: Unit): string {
  const sign = v < -1e-9 ? "−" : "";
  const a = Math.abs(v);
  const short = (x: number) => String(+x.toFixed(2));
  if (unit === "usd") return `${sign}$${short(a / 100)}`;
  return `${sign}${a >= 1000 ? `${short(a / 1000)}k` : short(a)}`;
}

const when = (t: number) =>
  new Date(t).toLocaleString("ru", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Ширина элемента в пикселях. Callback-ref: элемент может появиться не с первого рендера. */
function useWidth(): [(el: HTMLDivElement | null) => void, number] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

/** Бегунок на линейке: номер раздачи под курсором или выбранной. */
function RulerBadge({ x, y, n, color }: { x: number; y: number; n: number; color: string }) {
  const label = n.toLocaleString("ru");
  const w = label.length * 6.2 + 10;
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={y} y2={y + 8} stroke={color} strokeWidth={1.5} />
      <rect x={x - w / 2} y={y + 8} width={w} height={15} rx={4} fill="#0b100e" stroke={color} />
      <text x={x} y={y + 19} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

/**
 * График выигрыша: четыре линии с легендой-переключателем, bb или $, подсказка
 * по наведению, зум выделением мышью и отметки олл-инов. Сводка в легенде
 * считается по видимому участку, поэтому зум — это ещё и «разбор отрезка».
 */
export function EvChart({
  points,
  selectedId,
  onSelect,
}: {
  points: GraphPoint[];
  /** Выбранная раздача: кликом по графику или в таблице олл-инов. */
  selectedId?: string | null;
  onSelect?: (handId: string) => void;
}) {
  const compact = useIsCompact();
  const [wrap, width] = useWidth();
  const [unit, setUnit] = useState<Unit>("bb");
  const [shown, setShown] = useState<Record<LineKey, boolean>>({ actual: true, ev: true, sd: false, nonSd: false });
  const [markers, setMarkers] = useState(true);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);

  const last = points.length - 1;
  // Новый набор раздач (сменился фильтр) — старый зум к нему не относится.
  useEffect(() => setZoom(null), [points]);

  const focusIdx = useMemo(
    () => (selectedId ? points.findIndex((p) => p.handId === selectedId) : -1),
    [points, selectedId],
  );
  // Выбранная раздача за краем зума — сдвинуть окно к ней, сохранив ширину
  // (листание стрелками не должно выкидывать на весь график). Только на смену
  // выбора: иначе новый зум мимо выбранной раздачи тут же съезжал бы.
  useEffect(() => {
    if (focusIdx < 0) return;
    setZoom((z) => {
      if (!z || (focusIdx >= z[0] && focusIdx <= z[1])) return z;
      const w = z[1] - z[0];
      const start = Math.max(0, Math.min(points.length - 1 - w, focusIdx - Math.round(w / 2)));
      return [start, start + w];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdx]);

  const [from, to] = zoom ?? [0, last];
  const H = compact ? 220 : 300;
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = H - M.top - M.bottom;
  const active = LINE_KEYS.filter((k) => shown[k]);

  const { lo, hi, paths, allIns } = useMemo(() => {
    let lo = 0;
    let hi = 0;
    for (let i = from; i <= to; i++) {
      for (const k of active) {
        const v = valueOf(points[i], k, unit);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const pad = (hi - lo || 1) * 0.06;
    lo -= pad;
    hi += pad;
    const span = hi - lo;
    const sx = (i: number) => M.left + (to === from ? 0.5 : (i - from) / (to - from)) * plotW;
    const sy = (v: number) => M.top + (1 - (v - lo) / span) * plotH;
    const paths = {} as Record<LineKey, string>;
    for (const k of active) {
      const vals: number[] = [];
      for (let i = from; i <= to; i++) vals.push(valueOf(points[i], k, unit));
      paths[k] = downsample(vals, Math.ceil(plotW))
        .map((j, n) => `${n ? "L" : "M"}${sx(from + j).toFixed(1)},${sy(vals[j]).toFixed(1)}`)
        .join("");
    }
    const allIns: number[] = [];
    for (let i = from; i <= to; i++) if (points[i].allIn) allIns.push(i);
    return { lo, hi, paths, allIns };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, from, to, unit, plotW, plotH, active.join()]);

  if (points.length < 2) return null;

  const span = hi - lo;
  const sx = (i: number) => M.left + (to === from ? 0.5 : (i - from) / (to - from)) * plotW;
  const sy = (v: number) => M.top + (1 - (v - lo) / span) * plotH;
  const idxAt = (px: number) =>
    Math.max(from, Math.min(to, Math.round(from + ((px - M.left) / plotW) * (to - from))));

  const yTicks = niceTicks(lo, hi, compact ? 4 : 6);
  const xTicks = niceTicks(from + 1, to + 1, compact ? 3 : 6).filter((v) => Number.isInteger(v));
  // Мелкие деления — пятая часть шага, пока она не меньше одной раздачи.
  const xStep = xTicks.length > 1 ? xTicks[1] - xTicks[0] : 0;
  const minorTicks: number[] = [];
  if (xStep >= 5) {
    const m = xStep / 5;
    for (let v = Math.ceil((from + 1) / m) * m; v <= to + 1; v += m) if (v % xStep !== 0) minorTicks.push(v);
  }
  const y0 = M.top + plotH;

  /**
   * Индекс под курсором. На 15 тысячах раздач в пиксель попадает с десяток
   * раздач, и попасть мышью ровно в олл-ин невозможно, поэтому курсор
   * примагничивается к ближайшей отметке в пределах 6px.
   */
  const pick = (px: number) => {
    if (markers) {
      let best = -1;
      let dist = 6;
      for (const i of allIns) {
        const d = Math.abs(sx(i) - px);
        if (d <= dist) {
          dist = d;
          best = i;
        }
      }
      if (best >= 0) return best;
    }
    return idxAt(px);
  };

  const localX = (e: React.PointerEvent) => e.clientX - (e.currentTarget as Element).getBoundingClientRect().left;

  const n = to - from + 1;
  const luck = deltaOn(points, from, to, "actual", unit) - deltaOn(points, from, to, "ev", unit);

  const hp = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null && sx(hover) > width / 2;

  return (
    <div className="space-y-3">
      {/* Панель: единицы, отметки, зум */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {(["bb", "usd"] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-2.5 py-1 font-semibold ${unit === u ? "bg-white/10 text-neutral-100" : "text-neutral-500 hover:bg-white/5"}`}
            >
              {u === "bb" ? "bb" : "$"}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-neutral-400">
          <input type="checkbox" checked={markers} onChange={(e) => setMarkers(e.target.checked)} className="accent-emerald-500" />
          олл-ины на графике
        </label>
        <span className="ml-auto text-neutral-500">
          {zoom ? (
            <>
              раздачи {(from + 1).toLocaleString("ru")}–{(to + 1).toLocaleString("ru")} ·{" "}
              <button onClick={() => setZoom(null)} className="text-emerald-400 hover:underline">
                весь график
              </button>
            </>
          ) : (
            !compact && "клик — открыть раздачу, выделение мышью — приблизить"
          )}
        </span>
      </div>

      {/* Легенда = переключатели линий + сводка по видимому участку */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {LINE_KEYS.map((k) => {
          const d = deltaOn(points, from, to, k, unit);
          const bb100 = (deltaOn(points, from, to, k, "bb") / n) * 100;
          return (
            <button
              key={k}
              title={LINES[k].hint}
              onClick={() => setShown({ ...shown, [k]: !shown[k] })}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                shown[k] ? "border-white/15 bg-white/[0.04]" : "border-white/5 opacity-45 hover:opacity-70"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span className="h-0.5 w-4 rounded" style={{ background: LINES[k].color }} />
                {LINES[k].label}
              </div>
              <div className={`mt-0.5 text-sm font-bold tabular-nums ${d >= 0 ? "text-neutral-100" : "text-rose-300"}`}>
                {fmt(d, unit)}
              </div>
              <div className="text-[11px] tabular-nums text-neutral-500">{bb100 >= 0 ? "+" : "−"}{Math.abs(bb100).toFixed(2)} bb/100</div>
            </button>
          );
        })}
        <div className="col-span-2 rounded-xl border border-white/10 px-3 py-2 lg:col-span-1">
          <div className="text-[11px] text-neutral-400">Удача (факт − EV)</div>
          <div className={`mt-0.5 text-sm font-bold tabular-nums ${luck >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmt(luck, unit)}
          </div>
          <div className="text-[11px] tabular-nums text-neutral-500">
            {n.toLocaleString("ru")} раздач · {allIns.length} олл-инов
          </div>
        </div>
      </div>

      <div ref={wrap} className="relative select-none" style={{ height: H }}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            className="block"
            style={{ touchAction: "pan-y", cursor: drag ? "col-resize" : "crosshair" }}
            onPointerMove={(e) => {
              const x = localX(e);
              setHover(pick(x));
              if (drag) setDrag([drag[0], x]);
            }}
            onPointerLeave={() => {
              setHover(null);
              setDrag(null);
            }}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button === 0) setDrag([localX(e), localX(e)]);
            }}
            onPointerUp={(e) => {
              if (drag && Math.abs(drag[1] - drag[0]) > 6) {
                const a = idxAt(Math.min(drag[0], drag[1]));
                const b = idxAt(Math.max(drag[0], drag[1]));
                if (b - a >= 10) setZoom([a, b]);
              } else if (onSelect) {
                // Клик (или тап — на тач-экране pointermove до него может и не быть).
                onSelect(points[pick(localX(e))].handId);
              }
              setDrag(null);
            }}
            onDoubleClick={() => setZoom(null)}
          >
            {/* Сетка и ось Y */}
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={sy(v)}
                  y2={sy(v)}
                  stroke={v === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.06)"}
                  strokeDasharray={v === 0 ? undefined : "2 4"}
                />
                <text x={M.left - 6} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={10} fill="#737373">
                  {axisLabel(v, unit)}
                </text>
              </g>
            ))}
            {/* Линейка — номер раздачи */}
            <rect x={M.left} y={y0} width={plotW} height={7} fill="rgba(255,255,255,0.035)" />
            <line x1={M.left} x2={M.left + plotW} y1={y0} y2={y0} stroke="rgba(255,255,255,0.2)" />
            {minorTicks.map((v) => (
              <line key={`m${v}`} x1={sx(v - 1)} x2={sx(v - 1)} y1={y0} y2={y0 + 3} stroke="rgba(255,255,255,0.18)" />
            ))}
            {xTicks.map((v) => (
              <g key={v}>
                <line x1={sx(v - 1)} x2={sx(v - 1)} y1={y0} y2={y0 + 7} stroke="rgba(255,255,255,0.4)" />
                <text x={sx(v - 1)} y={y0 + 19} textAnchor="middle" fontSize={10} fill="#8a8a8a">
                  {v.toLocaleString("ru")}
                </text>
              </g>
            ))}
            <text x={M.left - 6} y={y0 + 19} textAnchor="end" fontSize={10} fill="#525252">
              раздачи
            </text>
            <text x={M.left + plotW} y={y0 + 33} textAnchor="end" fontSize={10} fill="#525252">
              {zoom ? `${n.toLocaleString("ru")} из ${points.length.toLocaleString("ru")}` : `всего ${points.length.toLocaleString("ru")}`}
            </text>
            {focusIdx >= from && focusIdx <= to && <RulerBadge x={sx(focusIdx)} y={y0} n={focusIdx + 1} color="#f59e0b" />}
            {hover !== null && hover !== focusIdx && <RulerBadge x={sx(hover)} y={y0} n={hover + 1} color="#e5e5e5" />}

            {/* Линии: факт поверх остальных */}
            {(["nonSd", "sd", "ev", "actual"] as LineKey[])
              .filter((k) => shown[k])
              .map((k) => (
                <path
                  key={k}
                  d={paths[k]}
                  fill="none"
                  stroke={LINES[k].color}
                  strokeWidth={LINES[k].width}
                  strokeLinejoin="round"
                  opacity={k === "actual" || k === "ev" ? 1 : 0.85}
                />
              ))}

            {/* Олл-ины: точка на линии факта; зелёная — повезло, красная — нет */}
            {markers &&
              allIns.length <= 600 &&
              allIns.map((i) => {
                const s = points[i].allIn!;
                const good = s.actual >= s.ev;
                return (
                  <circle
                    key={i}
                    cx={sx(i)}
                    cy={sy(valueOf(points[i], shown.actual ? "actual" : "ev", unit))}
                    r={i === focusIdx ? 5 : 2.6}
                    fill={good ? "#22c07b" : "#f43f5e"}
                    stroke="#0f1513"
                    strokeWidth={1}
                  />
                );
              })}

            {focusIdx >= from && focusIdx <= to && (
              <g pointerEvents="none">
                <line x1={sx(focusIdx)} x2={sx(focusIdx)} y1={M.top} y2={M.top + plotH} stroke="rgba(245,158,11,0.6)" strokeDasharray="3 3" />
                <circle
                  cx={sx(focusIdx)}
                  cy={sy(valueOf(points[focusIdx], shown.actual ? "actual" : active[0] ?? "ev", unit))}
                  r={5}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </g>
            )}

            {/* Выделение для зума */}
            {drag && (
              <rect
                x={Math.min(drag[0], drag[1])}
                y={M.top}
                width={Math.abs(drag[1] - drag[0])}
                height={plotH}
                fill="rgba(34,192,123,0.12)"
                stroke="rgba(34,192,123,0.5)"
              />
            )}

            {/* Перекрестие */}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={sx(hover)} x2={sx(hover)} y1={M.top} y2={M.top + plotH} stroke="rgba(255,255,255,0.25)" />
                {active.map((k) => (
                  <circle key={k} cx={sx(hover)} cy={sy(valueOf(points[hover], k, unit))} r={3.5} fill={LINES[k].color} stroke="#0f1513" strokeWidth={1.5} />
                ))}
              </g>
            )}
          </svg>
        )}

        {hp && hover !== null && !drag && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-52 rounded-lg border border-white/15 bg-[#0b100e]/95 px-3 py-2 text-[11px] shadow-xl"
            style={tipLeft ? { right: width - sx(hover) + 12 } : { left: sx(hover) + 12 }}
          >
            <div className="font-semibold text-neutral-200">Раздача {hp.n.toLocaleString("ru")}</div>
            <div className="mb-1.5 text-neutral-500">{when(hp.time)}</div>
            {active.map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="h-0.5 w-3 rounded" style={{ background: LINES[k].color }} />
                  {LINES[k].label}
                </span>
                <span className="tabular-nums text-neutral-200">{fmt(valueOf(hp, k, unit), unit)}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5">
              <span className="text-neutral-500">в раздаче{hp.showdown ? " · вскрытие" : ""}</span>
              <span className={`tabular-nums ${hp.net[0] >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmt(hp.net[unit === "bb" ? 0 : 1], unit)}
              </span>
            </div>
            {hp.allIn && (
              <div className="mt-1 text-neutral-400">
                Олл-ин, эквити {(hp.allIn.equity * 100).toFixed(1)}% · EV{" "}
                {fmt(unit === "bb" ? hp.allIn.ev / hp.bb : hp.allIn.ev, unit)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
