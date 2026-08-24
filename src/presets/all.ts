// Плоский список всех пресетов. Вынесен из index.ts отдельно, чтобы
// tree.ts мог искать чарты по id, а index.ts — реэкспортировать дерево,
// без циклического импорта между ними.

import { RangePreset } from "./types";
import { RFI_PRESETS } from "./rfi";
import { ISO_PRESETS } from "./iso";
import { SB3BET_PRESETS } from "./sbDefense";
import { BBDEF_PRESETS } from "./bbDefense";
import { THREEBET_IP_PRESETS } from "./threeBetIP";
import { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";
import { BLINDS4BET_PRESETS } from "./blinds4bet";
import { DEF4BETIP_PRESETS } from "./def4betIP";
import { MTT_RFI_PRESETS } from "./mtt/rfi";
import { MTT_ISO_PRESETS } from "./mtt/iso";
import { MTT_VS_RFI_PRESETS } from "./mtt/vsRfi";
import { MTT_DEF3BET_PRESETS } from "./mtt/defVs3bet";
import { MTT_BBDEF_PRESETS } from "./mtt/bbDefense";
import { MTT_PUSH_PRESETS } from "./mtt/push";
import { MTT_3BETPUSH_PRESETS } from "./mtt/threeBetPush";

export const ALL_PRESETS: RangePreset[] = [
  ...RFI_PRESETS,
  ...ISO_PRESETS,
  ...SB3BET_PRESETS,
  ...BBDEF_PRESETS,
  ...THREEBET_IP_PRESETS,
  ...DEF3BETIP_PRESETS,
  ...DEF3BETOOP_PRESETS,
  ...BLINDS4BET_PRESETS,
  ...DEF4BETIP_PRESETS,
  ...MTT_RFI_PRESETS,
  ...MTT_ISO_PRESETS,
  ...MTT_VS_RFI_PRESETS,
  ...MTT_DEF3BET_PRESETS,
  ...MTT_BBDEF_PRESETS,
  ...MTT_PUSH_PRESETS,
  ...MTT_3BETPUSH_PRESETS,
];

export function presetById(id: string): RangePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}
