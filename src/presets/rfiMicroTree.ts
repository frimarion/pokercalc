// Ветка событий для "кэш микро". Оцифрованы RFI, 3бет (в позиции и без
// позиции), колл BB (кроме vs SB) и защита опенера на 3бет — дальше (защита от 4бета и т.д.) для
// этого источника чартов нет. Подставлять туда чарты Green Charts было бы
// враньём: другой источник, другая ширина. Честно: дерево не показывает
// линию, под которую нет чарта (тот же принцип, что у MTT_STACKS в
// mtt/tree.ts).
//
// В отличие от основного дерева (`ip3bet`/`sb3bet`/`bbdef` в tree.ts), где
// чарт выбирается по проценту опена соперника, здесь источник задаёт готовый
// чарт на каждого конкретного опенера — выбирать нечего. Чарт защиты блайнда
// иногда общий сразу на два опенера (UTG и MP делят один диапазон) — тогда
// оба ключа указывают на один и тот же presetId.
//
// Кто остаётся в позиции после 3бета — та же логика, что в основном дереве
// (см. tree.ts): 3бет от более поздней позиции оставляет опенера без
// позиции (defOOP), 3бет с блайнда — опенер остаётся в позиции (defIP).
// Исключение — SB: против него 3бетит только BB, а он там сам в позиции,
// поэтому SB после 3бета защищается как BEZ позиции (тот же defOOP).

import { TreeNode } from "./tree";
import { ActionKind } from "./types";

const RFI_MICRO_SEATS: {
  key: string;
  seat: string;
  size: string;
  threeBetIp?: string;
  defOOP?: string;
  sbVs?: string;
  bbVs?: string;
  /** Колл BB (`bbCallMicro.ts`) — вес руки кодирует сайзинг опена. */
  bbCall?: string;
  defIP?: string;
  /** SB: единственный ответ (BB — 3бет) ведёт в defOOP, а не в defIP. */
  bbLeadsToOOP?: boolean;
}[] = [
  {
    key: "utg",
    seat: "UTG",
    size: "3bb",
    threeBetIp: "3betip-micro-utg",
    defOOP: "def3betoop-micro-utg",
    sbVs: "3betoop-micro-sb-vs-utg-mp",
    bbVs: "3betoop-micro-bb-vs-utg-mp",
    bbCall: "bbcall-micro-vs-utg-mp",
    defIP: "def3betip-micro-utg",
  },
  {
    key: "mp",
    seat: "MP",
    size: "3bb",
    threeBetIp: "3betip-micro-mp",
    defOOP: "def3betoop-micro-mp",
    sbVs: "3betoop-micro-sb-vs-utg-mp",
    bbVs: "3betoop-micro-bb-vs-utg-mp",
    bbCall: "bbcall-micro-vs-utg-mp",
    defIP: "def3betip-micro-mp",
  },
  {
    key: "co",
    seat: "CO",
    size: "2.5bb",
    threeBetIp: "3betip-micro-co",
    defOOP: "def3betoop-micro-co",
    sbVs: "3betoop-micro-sb-vs-co",
    bbVs: "3betoop-micro-bb-vs-co",
    bbCall: "bbcall-micro-vs-co",
    defIP: "def3betip-micro-co",
  },
  {
    key: "btn",
    seat: "BU",
    size: "2.5bb",
    sbVs: "3betoop-micro-sb-vs-bu",
    bbVs: "3betoop-micro-bb-vs-bu",
    bbCall: "bbcall-micro-vs-bu",
    defIP: "def3betip-micro-btn",
  },
  {
    key: "sb",
    seat: "SB",
    size: "3bb",
    bbVs: "3betoop-micro-bb-vs-sb",
    defOOP: "def3betoop-micro-sb",
    bbLeadsToOOP: true,
  },
];

/** Шаг «опенер отвечает на 3бет» — весь диапазон / колл / 4бет. */
function defenseNode(presetId: string, ip: boolean): TreeNode {
  return {
    title: "Ответ опенера на 3бет",
    note: ip ? "3бет с блайнда — опенер в позиции" : "3бет в позицию — опенер без позиции",
    showFold: true,
    options: [
      { key: "all", label: "Весь диапазон", presetId },
      { key: "call", label: "Колл 3бета", presetId, actionKind: "call" as ActionKind },
      { key: "raise", label: "4бет", presetId, actionKind: "raise" as ActionKind },
    ],
  };
}

export const RFI_MICRO_TREE: TreeNode = {
  title: "Кто открыл",
  note: "источник «кэш микро» — RFI, 3бет и защита опенера, остальные ответы (4бет и т.д.) не покрыты",
  showFold: true,
  options: RFI_MICRO_SEATS.map(
    ({ key, seat, size, threeBetIp, defOOP, sbVs, bbVs, bbCall, defIP, bbLeadsToOOP }) => {
      const options = [
        ...(threeBetIp
          ? [
              {
                key: "ip3bet",
                label: "3бет в позиции",
                presetId: threeBetIp,
                actionKind: "raise" as ActionKind,
                next: defOOP ? defenseNode(defOOP, false) : undefined,
              },
            ]
          : []),
        ...(sbVs
          ? [
              {
                key: "sb3bet",
                label: "SB — 3бет",
                presetId: sbVs,
                actionKind: "raise" as ActionKind,
                next: defIP ? defenseNode(defIP, true) : undefined,
              },
            ]
          : []),
        ...(bbVs
          ? [
              {
                key: "bb3bet",
                label: "BB — 3бет",
                presetId: bbVs,
                actionKind: "raise" as ActionKind,
                next: bbLeadsToOOP
                  ? (defOOP ? defenseNode(defOOP, false) : undefined)
                  : (defIP ? defenseNode(defIP, true) : undefined),
              },
            ]
          : []),
        ...(bbCall
          ? [
              {
                key: "bbcall",
                label: "BB — колл",
                presetId: bbCall,
                actionKind: "call" as ActionKind,
              },
            ]
          : []),
      ];
      return {
        key,
        label: seat,
        note: `рейз ${size}`,
        presetId: `rfi-micro-${key}`,
        actionKind: "raise" as ActionKind,
        next:
          options.length > 0
            ? { title: "Ответ на опен", note: "остальные фолд", showFold: true, options }
            : undefined,
      };
    },
  ),
};
