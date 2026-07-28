import { useState } from "react";
import { BoardBar } from "./ui/BoardBar";
import { MatrixPanel } from "./ui/MatrixPanel";
import { SidePanel } from "./ui/SidePanel";
import { Trainer } from "./ui/Trainer";
import { useStore } from "./state/store";

type Mode = "ranges" | "trainer";

function HeaderTools() {
  const saveScenario = useStore((s) => s.saveScenario);
  const loadScenario = useStore((s) => s.loadScenario);
  const resetAll = useStore((s) => s.resetAll);

  const btn = "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5";
  return (
    <div className="ml-auto flex items-center gap-2">
      <button className={btn} onClick={saveScenario}>
        💾 Сохранить
      </button>
      <button className={btn} onClick={() => loadScenario()}>
        📂 Загрузить
      </button>
      <button
        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-white/5"
        onClick={resetAll}
      >
        ↺ Сброс
      </button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("ranges");

  const tab = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        mode === m
          ? "bg-emerald-500 text-black"
          : "border border-white/10 text-neutral-400 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-full">
      {/* Шапка */}
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-3">
        <span className="text-emerald-400">📈</span>
        <span className="text-lg font-black tracking-tight">
          Poker<span className="text-emerald-400">Calc</span>
        </span>
        <div className="ml-3 flex items-center gap-1.5">
          {tab("ranges", "Диапазоны")}
          {tab("trainer", "Тренажёр")}
        </div>
        {mode === "ranges" && <HeaderTools />}
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {mode === "trainer" ? (
          <Trainer />
        ) : (
          <>
            {/* Верхняя панель: hero + борд */}
            <section className="mb-6">
              <BoardBar />
            </section>

            {/* Рабочая зона: матрица + боковая панель */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-white/10 bg-[#0b100e] p-4">
                <MatrixPanel />
              </div>
              <SidePanel />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
