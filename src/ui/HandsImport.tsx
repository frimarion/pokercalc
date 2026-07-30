import { useRef, useState } from "react";
import { useHhStore } from "../state/hhStore";

/** Загрузка выгрузок GG: .txt или .zip, кнопкой или перетаскиванием. */
export function HandsImport() {
  const hands = useHhStore((s) => s.hands);
  const progress = useHhStore((s) => s.progress);
  const last = useHhStore((s) => s.last);
  const error = useHhStore((s) => s.error);
  const importFiles = useHhStore((s) => s.importFiles);
  const clear = useHhStore((s) => s.clear);

  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const busy = progress !== null;
  const pctDone = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!busy) void importFiles([...e.dataTransfer.files]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-2xl border p-4 transition ${
        dragging ? "border-emerald-400 bg-emerald-500/5" : "border-white/10 bg-[#0b100e]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-sm font-semibold">
            {hands.length > 0 ? `${hands.length.toLocaleString("ru")} раздач в базе` : "База пуста"}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">
            Перетащите сюда .txt или .zip из выгрузки GGPoker
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={input}
            type="file"
            multiple
            accept=".txt,.zip"
            className="hidden"
            onChange={(e) => {
              void importFiles([...(e.target.files ?? [])]);
              e.target.value = ""; // чтобы тот же файл можно было выбрать снова
            }}
          />
          <button
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy ? "Импорт…" : "Выбрать файлы"}
          </button>
          {hands.length > 0 && (
            <button
              disabled={busy}
              onClick={() => {
                if (confirmClear) {
                  void clear();
                  setConfirmClear(false);
                } else setConfirmClear(true);
              }}
              onBlur={() => setConfirmClear(false)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-white/5 disabled:opacity-40"
            >
              {confirmClear ? "Точно удалить всё?" : "Очистить базу"}
            </button>
          )}
        </div>
      </div>

      {progress && (
        <div className="mt-3">
          <div className="h-1 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${pctDone}%` }} />
          </div>
          <div className="mt-1.5 truncate text-xs text-neutral-500">
            {progress.label} · {progress.done}/{progress.total}
          </div>
        </div>
      )}

      {last && (
        <div className="mt-3 text-xs text-neutral-400">
          Разобрано файлов: {last.files}. Добавлено раздач: {last.added}
          {last.duplicates > 0 && `, уже были в базе: ${last.duplicates}`}.
        </div>
      )}

      {error && <div className="mt-3 text-xs text-rose-400">Ошибка импорта: {error}</div>}
    </div>
  );
}
