// Ветка событий MTT (8-max, 100bb, ChipEV).
//
// Пока оцифрован только опен, поэтому дерево одноуровневое: выбираем место —
// получаем его RFI. Продолжений (защита блайндов, ответ на 3бет) в MTT-чартах
// ещё нет, и подставлять сюда кэшевые Green Charts нельзя: там другой размер
// стола и другие сайзинги.

import { TreeNode, TreeOption } from "../tree";
import { MTT_RFI_PRESETS } from "./rfi";

/** SB играет опен-лимпом, поэтому его чарт разбирается по действиям. */
function sbNode(presetId: string): TreeNode {
  return {
    title: "SB — как разыграть",
    note: "лимп входит в стратегию SB",
    options: [
      { key: "all", label: "Весь диапазон", presetId },
      { key: "raise", label: "Опен рейзом", presetId, actionKind: "raise" },
      { key: "call", label: "Лимп", presetId, actionKind: "call" },
    ],
  };
}

export const MTT_TREE: TreeNode = {
  title: "Опен",
  note: "8-max · 100bb · все до этого сфолдили",
  showFold: true,
  options: MTT_RFI_PRESETS.map((p): TreeOption => {
    const hasCall = p.actions.some((a) => a.kind === "call");
    // Сайзинг вынесен в subtitle чарта — вытаскиваем его для подписи кнопки.
    const size = p.subtitle.match(/опен ([\d.]+bb)/)?.[1];
    return {
      key: p.id.replace("mtt-rfi-", ""),
      label: p.position,
      note: size ? `рейз ${size}` : undefined,
      presetId: p.id,
      actionKind: hasCall ? "raise" : undefined,
      next: hasCall ? sbNode(p.id) : undefined,
    };
  }),
};
