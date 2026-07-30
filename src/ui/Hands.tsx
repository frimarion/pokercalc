import { useEffect, useState } from "react";
import { useHhStore } from "../state/hhStore";
import { HandsImport } from "./HandsImport";
import { HandsStats } from "./HandsStats";
import { HandsDeviations } from "./HandsDeviations";
import { HandsEv } from "./HandsEv";

type View = "stats" | "charts" | "ev";

const VIEWS: { key: View; label: string }[] = [
  { key: "stats", label: "Статистика" },
  { key: "charts", label: "Сверка с чартами" },
  { key: "ev", label: "EV и олл-ины" },
];

/** Вкладка «История рук»: импорт выгрузок GG и разбор своей игры. */
export function Hands() {
  const hands = useHhStore((s) => s.hands);
  const loading = useHhStore((s) => s.loading);
  const load = useHhStore((s) => s.load);
  const [view, setView] = useState<View>("stats");

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <HandsImport />

      {hands.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0b100e] px-6 py-10 text-center">
          {loading ? (
            <div className="text-sm text-neutral-500">Загрузка базы…</div>
          ) : (
            <>
              <div className="text-sm text-neutral-300">Загрузите историю рук, чтобы увидеть разбор</div>
              <div className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-neutral-500">
                В клиенте GGPoker: <b>Настройки → История рук → Скачать</b>. Придёт zip с .txt по
                одному на стол — его можно бросить сюда целиком. Повторные загрузки безопасны:
                раздачи опознаются по номеру и не дублируются.
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  view === v.key
                    ? "bg-emerald-500 text-black"
                    : "border border-white/10 text-neutral-400 hover:bg-white/5"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b100e] p-4">
            {view === "stats" && <HandsStats hands={hands} />}
            {view === "charts" && <HandsDeviations hands={hands} />}
            {view === "ev" && <HandsEv hands={hands} />}
          </div>
        </>
      )}
    </div>
  );
}
