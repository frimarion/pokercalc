import { useState } from "react";
import {
  resolvePath,
  presetForPath,
  presetById,
  presetWidthPct,
  FORMATS,
  FormatKey,
} from "../presets";
import { useStore } from "../state/store";

/**
 * Ветка событий префлопа — спот собирается по шагам, как action tree
 * в GTO Wizard: кто открыл → кто и как ответил → как опенер ответил
 * на 3бет. Каждый шаг применяет свой чарт.
 *
 * У кэша (6-max, Green Charts) и MTT (8-max, солвер) свои деревья —
 * переключатель формата выбирает корень.
 */
export function ActionTree() {
  const applyPreset = useStore((s) => s.applyPreset);
  const activeSide = useStore((s) => s.activeSide);
  const [format, setFormat] = useState<FormatKey>("cash");
  const [path, setPath] = useState<string[]>([]);
  const [withSituational, setWithSituational] = useState(true);

  const root = FORMATS.find((f) => f.key === format)!.tree;
  const chain = resolvePath(path, root);
  const { presetId, actionKind } = presetForPath(path, root);
  const preset = presetId ? presetById(presetId) : undefined;

  const apply = (nextPath: string[], situational: boolean) => {
    const target = presetForPath(nextPath, root);
    if (target.presetId) applyPreset(target.presetId, situational, target.actionKind);
  };

  const choose = (depth: number, key: string) => {
    // Выбор на шаге отбрасывает всё, что было выбрано дальше по линии.
    const next = [...path.slice(0, depth), key];
    setPath(next);
    apply(next, withSituational);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0d1210] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">
          Ветка событий
        </span>
        <div className="flex rounded-md border border-white/10 p-0.5">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              title={f.note}
              onClick={() => {
                setFormat(f.key);
                setPath([]); // деревья разные — путь кэша в MTT не имеет смысла
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                format === f.key
                  ? "bg-emerald-500 text-black"
                  : "text-neutral-400 hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {path.length > 0 && (
          <button
            onClick={() => setPath([])}
            className="rounded px-1.5 py-0.5 text-[10px] text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
          >
            ↺ сбросить
          </button>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={withSituational}
            onChange={(e) => {
              setWithSituational(e.target.checked);
              apply(path, e.target.checked);
            }}
            className="accent-amber-500"
          />
          частичные
        </label>
        <span className="text-[10px] text-neutral-600">
          → в {activeSide === "hero" ? "Hero" : "Villain"}
        </span>
      </div>

      <div className="flex items-start gap-1.5 overflow-x-auto pb-1">
        {chain.map(({ node, chosen }, depth) => (
          <div
            key={depth}
            className={`w-[168px] shrink-0 rounded-lg border bg-black/20 ${
              chosen ? "border-emerald-500/50" : "border-white/10"
            }`}
          >
            <div className="border-b border-white/10 px-2 py-1.5">
              <div className="text-[11px] font-semibold text-neutral-200">{node.title}</div>
              {node.note && (
                <div className="mt-0.5 text-[9px] leading-tight text-neutral-500">{node.note}</div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 p-1">
              {node.showFold && (
                <div className="rounded px-1.5 py-1 text-[11px] text-neutral-600">Фолд</div>
              )}
              {node.options.map((o) => {
                const active = chosen?.key === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => choose(depth, o.key)}
                    className={`rounded px-1.5 py-1 text-left text-[11px] font-semibold transition ${
                      active
                        ? "bg-emerald-500 text-black"
                        : "text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    {o.label}
                    {o.note && (
                      <span
                        className={`block text-[9px] font-normal leading-tight ${
                          active ? "text-black/60" : "text-neutral-500"
                        }`}
                      >
                        {o.note}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-neutral-500">
        {preset ? (
          <>
            Чарт: <span className="text-neutral-300">{preset.title}</span>
            {actionKind && (
              <span className="text-neutral-400">
                {" "}
                · только {actionKind === "call" ? "колл" : "рейз"}
              </span>
            )}
            <span className="text-neutral-600">
              {" "}
              · {presetWidthPct(preset, actionKind).toFixed(1)}% рук
            </span>
          </>
        ) : (
          "Выберите, кто открывает"
        )}
      </div>
    </div>
  );
}
