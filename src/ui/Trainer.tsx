import { useMemo, useState } from "react";
import {
  QUIZ_SPOTS,
  QuizAnswer,
  Question,
  nextQuestion,
  isCorrect,
  actionEdges,
  familyLabel,
  TRAINER_SECTIONS,
  TrainerSection,
  sectionGroupLabel,
  declinesByCheck,
} from "../presets/quiz";
import { PresetGroup, RangePreset, presetById } from "../presets";
import { SceneActionKind, sceneFor } from "../presets/scene";
import { HeroAction, PokerTable } from "./PokerTable";
import { SuitIndex } from "../engine/cards";

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

/**
 * Чем ответ игрока выглядит за столом. Один и тот же `raise` — это опен на
 * RFI, 4бет в защите от 3бета и олл-ин на коротком стеке: облако над местом
 * должно называться и краситься так же, как чужие действия.
 */
function sceneKindOf(preset: RangePreset, answer: QuizAnswer): SceneActionKind {
  const group = preset.group;
  // На BB в лимпед-поте отказ — это чек, а не фолд: карты мы не сдаём.
  if (answer === "fold") return declinesByCheck(preset) ? "check" : "fold";
  if (answer === "call") return group === "ISO" || group === "MTTISO" ? "limp" : "call";
  // Приманка на пуш-фолде: рейз не в олл-ин. За столом это обычный рейз/3бет.
  if (answer === "smallraise") return group === "MTT3BETPUSH" ? "3bet" : "raise";
  switch (group) {
    case "MTTPUSH":
    case "MTT3BETPUSH":
    case "BLINDS4BET":
      return "push";
    case "DEF3BETIP":
    case "DEF3BETOOP":
    case "MTTDEF3BET":
      return "4bet";
    case "RFI":
    case "ISO":
    case "MTTRFI":
    case "MTTISO":
      return "raise";
    default:
      return "3bet";
  }
}

export function Trainer() {
  // Кэш и MTT не смешиваются в одном прогоне: чарты разные и по сайзингам, и
  // по глубине стека, а вопрос показывает только руку и спот — вперемешку
  // было бы непонятно, по какому источнику отвечать.
  const [section, setSection] = useState<TrainerSection>(TRAINER_SECTIONS[0]);
  const [enabled, setEnabled] = useState<Set<PresetGroup>>(new Set(section.groups));
  const [spotsOpen, setSpotsOpen] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [cards, setCards] = useState<{ rank: string; suit: SuitIndex }[]>([]);
  const [answered, setAnswered] = useState<QuizAnswer | null>(null);
  // Номер раздачи: по нему стол переигрывает сцену даже когда чарт тот же.
  const [deal, setDeal] = useState(0);
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
    setDeal((n) => n + 1);
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

  /** Пул по набору групп — нужен и при смене формата, и при клике по группе. */
  const poolOf = (groups: Set<PresetGroup>) =>
    QUIZ_SPOTS.filter((s) => {
      const g = presetById(s.presetId)?.group;
      return g ? groups.has(g) : false;
    });

  const toggleGroup = (g: PresetGroup) => {
    const next = new Set(enabled);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    if (next.size === 0) return; // хотя бы одна группа должна остаться
    setEnabled(next);
    ask(poolOf(next));
  };

  const switchSection = (s: TrainerSection) => {
    if (s.key === section.key) return;
    const groups = new Set(s.groups);
    setSection(s);
    setEnabled(groups);
    // Счёт не сбрасываем: он про игрока, а не про источник чартов.
    ask(poolOf(groups));
  };

  const pctRight = score.total > 0 ? (score.right / score.total) * 100 : 0;
  const correctKeys = question
    ? question.spot.answers.filter((a) => isCorrect(question, a.key)).map((a) => a.key)
    : [];
  const wasRight = answered !== null && correctKeys.includes(answered);
  const edges = question ? actionEdges(question.preset, question.hand) : [];
  const scene = useMemo(() => (question ? sceneFor(question.preset) : null), [question]);
  const heroAction: HeroAction | null =
    question && answered
      ? {
          label: question.spot.answers.find((a) => a.key === answered)?.label ?? answered,
          kind: sceneKindOf(question.preset, answered),
          correct: wasRight,
        }
      : null;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-3 sm:gap-4">
      {/* Что тренируем: сначала формат, потом группы внутри него. На телефоне
          список спотов занимал пол-экрана над вопросом, поэтому он свёрнут:
          развернуть его нужно раз за сессию, а стол — каждую раздачу. */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0d1210] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-neutral-500">
            Формат
          </span>
          {TRAINER_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => switchSection(s)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition sm:px-2.5 sm:py-1 ${
                s.key === section.key
                  ? "bg-emerald-500 text-black"
                  : "border border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-1 hidden text-[11px] text-neutral-600 sm:inline">{section.note}</span>
          <button
            onClick={() => setSpotsOpen((v) => !v)}
            className="ml-auto rounded-md px-2 py-1.5 text-[11px] font-semibold text-neutral-400 transition hover:bg-white/5 sm:hidden"
          >
            Споты {enabled.size}/{section.groups.length} {spotsOpen ? "▲" : "▼"}
          </button>
        </div>
        <div
          className={`${spotsOpen ? "flex" : "hidden"} flex-wrap items-center gap-1.5 sm:flex`}
        >
          <span className="mr-1 hidden text-[11px] uppercase tracking-wider text-neutral-500 sm:inline">
            Споты
          </span>
          {section.groups.map((g) => (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition sm:py-1 ${
                enabled.has(g)
                  ? "bg-emerald-500 text-black"
                  : "border border-white/10 text-neutral-400 hover:bg-white/5"
              }`}
            >
              {sectionGroupLabel(g)}
            </button>
          ))}
        </div>
      </div>

      {/* Счёт */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-[#0d1210] px-3 py-2 text-xs sm:px-4">
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
      <div className="rounded-2xl border border-white/10 bg-[#0b100e] p-3 sm:p-5">
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

            {/* Стол: места, чужие действия по очереди, наша рука на руках */}
            {scene && (
              <PokerTable
                scene={scene}
                cards={cards}
                heroAction={heroAction}
                questionKey={String(deal)}
              />
            )}

            <div className="text-center text-sm font-bold text-neutral-400">
              Ваша рука: <span className="text-neutral-100">{question.hand}</span>
            </div>

            {/* Кнопки ответа — главный элемент управления на телефоне: тянутся
                на всю ширину и держат высоту под палец (44px). */}
            <div className="flex flex-wrap justify-center gap-2">
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
                    className={`min-h-11 min-w-[7rem] flex-1 rounded-lg px-4 py-2 text-sm font-bold transition sm:min-h-0 sm:flex-none ${cls}`}
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
                  className="mt-1 min-h-11 w-full rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-emerald-400 sm:min-h-0 sm:w-auto sm:self-start"
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
