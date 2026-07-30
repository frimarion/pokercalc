import { useMemo, useState } from "react";
import {
  QUIZ_SPOTS,
  QuizAnswer,
  Question,
  nextQuestion,
  isCorrect,
  actionEdges,
  familyLabel,
} from "../presets/quiz";
import { GROUP_LABELS, PresetGroup, presetById } from "../presets";
import { SUIT_SYMBOLS, SuitIndex } from "../engine/cards";
import { suitColor } from "./colors";

/** Конкретные карты для ярлыка — чтобы рука выглядела как за столом. */
function dealHand(label: string): { rank: string; suit: SuitIndex }[] {
  const [a, b] = [label[0], label[1]];
  const suits: SuitIndex[] = [0, 1, 2, 3];
  const pick = () => suits[Math.floor(Math.random() * 4)];
  if (a === b) {
    const s1 = pick();
    let s2 = pick();
    while (s2 === s1) s2 = pick();
    return [{ rank: a, suit: s1 }, { rank: b, suit: s2 }];
  }
  if (label.endsWith("s")) {
    const s = pick();
    return [{ rank: a, suit: s }, { rank: b, suit: s }];
  }
  const s1 = pick();
  let s2 = pick();
  while (s2 === s1) s2 = pick();
  return [{ rank: a, suit: s1 }, { rank: b, suit: s2 }];
}

function Card({ rank, suit }: { rank: string; suit: SuitIndex }) {
  return (
    <div className="flex h-20 w-14 flex-col items-center justify-center rounded-lg border border-white/15 bg-[#141a18] text-2xl font-black">
      <span style={{ color: suitColor(suit) }}>{rank}</span>
      <span style={{ color: suitColor(suit) }} className="text-xl leading-none">
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

/** Группы спотов — ими выбирается, что тренировать. */
const GROUPS: PresetGroup[] = [
  "RFI",
  "ISO",
  "SB3BET",
  "BBDEF",
  "3BETIP",
  "DEF3BETIP",
  "DEF3BETOOP",
];

export function Trainer() {
  const [enabled, setEnabled] = useState<Set<PresetGroup>>(new Set(GROUPS));
  const [question, setQuestion] = useState<Question | null>(null);
  const [cards, setCards] = useState<{ rank: string; suit: SuitIndex }[]>([]);
  const [answered, setAnswered] = useState<QuizAnswer | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });

  const pool = useMemo(
    () =>
      QUIZ_SPOTS.filter((s) => {
        const g = presetById(s.presetId)?.group;
        return g ? enabled.has(g) : false;
      }),
    [enabled],
  );

  const ask = (from = pool) => {
    const q = nextQuestion(from);
    setQuestion(q);
    setCards(q ? dealHand(q.hand) : []);
    setAnswered(null);
  };

  const answer = (key: QuizAnswer) => {
    if (!question || answered) return;
    const ok = isCorrect(question, key);
    setAnswered(key);
    setScore((s) => {
      const streak = ok ? s.streak + 1 : 0;
      return {
        right: s.right + (ok ? 1 : 0),
        total: s.total + 1,
        streak,
        best: Math.max(s.best, streak),
      };
    });
  };

  const toggleGroup = (g: PresetGroup) => {
    const next = new Set(enabled);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    if (next.size === 0) return; // хотя бы одна группа должна остаться
    setEnabled(next);
    const nextPool = QUIZ_SPOTS.filter((s) => {
      const grp = presetById(s.presetId)?.group;
      return grp ? next.has(grp) : false;
    });
    ask(nextPool);
  };

  const pctRight = score.total > 0 ? (score.right / score.total) * 100 : 0;
  const correctKeys = question
    ? question.spot.answers.filter((a) => isCorrect(question, a.key)).map((a) => a.key)
    : [];
  const wasRight = answered !== null && correctKeys.includes(answered);
  const edges = question ? actionEdges(question.preset, question.hand) : [];

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      {/* Что тренируем */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d1210] px-3 py-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-neutral-500">
          Тренируем
        </span>
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => toggleGroup(g)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              enabled.has(g)
                ? "bg-emerald-500 text-black"
                : "border border-white/10 text-neutral-400 hover:bg-white/5"
            }`}
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Счёт */}
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0d1210] px-4 py-2 text-xs">
        <span className="text-neutral-400">
          Верно <span className="font-bold text-neutral-100">{score.right}</span> из{" "}
          <span className="font-bold text-neutral-100">{score.total}</span>
        </span>
        <span
          className={
            pctRight >= 80 ? "text-emerald-400" : pctRight >= 60 ? "text-amber-400" : "text-rose-400"
          }
        >
          {score.total > 0 ? `${pctRight.toFixed(0)}%` : "—"}
        </span>
        <span className="text-neutral-500">
          серия {score.streak} · рекорд {score.best}
        </span>
        {score.total > 0 && (
          <button
            onClick={() => setScore({ right: 0, total: 0, streak: 0, best: 0 })}
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
          >
            ↺ сбросить счёт
          </button>
        )}
      </div>

      {/* Вопрос */}
      <div className="rounded-2xl border border-white/10 bg-[#0b100e] p-5">
        {!question ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="max-w-sm text-center text-sm text-neutral-400">
              Тренажёр спрашивает только по пограничным и смешанным рукам — тем, где
              решение неочевидно. Мусор и премиум в середине диапазона не спрашиваются.
            </p>
            <button
              onClick={() => ask()}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
            >
              Начать
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-300">{question.spot.situation}</p>

            <div className="flex items-center gap-3">
              {cards.map((c, i) => (
                <Card key={i} rank={c.rank} suit={c.suit} />
              ))}
              <span className="ml-1 text-lg font-bold text-neutral-500">{question.hand}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {question.spot.answers.map((a) => {
                const isRight = correctKeys.includes(a.key);
                const chosen = answered === a.key;
                let cls = "border border-white/10 text-neutral-200 hover:bg-white/5";
                if (answered) {
                  if (isRight) cls = "bg-emerald-500 text-black";
                  else if (chosen) cls = "bg-rose-600 text-white";
                  else cls = "border border-white/10 text-neutral-600";
                }
                return (
                  <button
                    key={a.key}
                    onClick={() => answer(a.key)}
                    disabled={answered !== null}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${cls}`}
                  >
                    {a.label}
                    {answered && (
                      <span className="ml-2 text-xs font-normal opacity-80">
                        {Math.round(question.weights[a.key] * 100)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-3">
                <div
                  className={`text-sm font-bold ${
                    wasRight ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {wasRight ? "Верно" : "Неверно"}
                  {correctKeys.length > 1 && wasRight && " — рука играется смешанно"}
                </div>
                <div className="text-xs text-neutral-400">
                  По чарту «{question.preset.title}» рука {question.hand} играется так:{" "}
                  {question.spot.answers
                    .filter((a) => question.weights[a.key] > 0.01)
                    .map((a) => `${a.label.toLowerCase()} ${Math.round(question.weights[a.key] * 100)}%`)
                    .join(", ")}
                  .
                </div>

                {/* При ошибке подсказываем, где проходит граница в этом ряду —
                    так запоминается «докуда» тянется колл и рейз. */}
                {!wasRight && edges.length > 0 && (
                  <div className="text-xs text-amber-300/90">
                    Граница среди {familyLabel(question.hand)}:{" "}
                    {edges
                      .map((e) => {
                        const label =
                          question.spot.answers.find((a) => a.key === e.kind)?.label ?? e.kind;
                        return `${label.toLowerCase()} — до ${e.weakest}${
                          e.partial ? " (частично)" : ""
                        }`;
                      })
                      .join(", ")}
                    .
                  </div>
                )}
                <button
                  onClick={() => ask()}
                  className="mt-1 self-start rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-emerald-400"
                >
                  Дальше →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
