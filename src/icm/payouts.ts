// Выплаты рейтинга Doyle — порт calcPayouts из admin.html (репозиторий «doyle timer»).
//
// В рейтинговом турнире разыгрываются не деньги, а очки, и ICM считается в них:
//   - вход = 10 очков, аддон = 20; пул TOTAL = max(гарантия, 10·входов + 20·аддонов);
//   - из каждого входа 2 очка (в ПКО — 4) уходят под нокауты: KO_POOL;
//   - остальное (ITM_POOL) делится на P = max(3, ⌊0.15·входов⌋) призовых мест
//     геометрически: место k получает долю r^k (r = 0.8), округление — на первое.
//
// Формула обязана совпадать с админкой байт в байт, иначе ICM посчитает не те
// очки, что потом начислятся. Тест сверяет с разобранными в миграциях турнирами.

export interface DoyleRatingParams {
  entries: number;
  addons?: number;
  guarantee?: number;
  r?: number;
  pko?: boolean;
}

export interface DoylePayouts {
  /** Число призовых мест. */
  places: number;
  total: number;
  koPool: number;
  itmPool: number;
  /** Очки за места 1..P. */
  payouts: number[];
  /** Очки за один нокаут. */
  koValue: number;
}

export function doylePayouts({
  entries,
  addons = 0,
  guarantee = 800,
  r = 0.8,
  pko = false,
}: DoyleRatingParams): DoylePayouts {
  const E = Math.max(1, Math.floor(entries));
  const A = Math.max(0, Math.floor(addons));
  const guar = Math.max(0, Math.floor(guarantee));
  if (!(r > 0 && r < 1)) throw new Error("r должен быть между 0 и 1");
  const P = Math.max(3, Math.floor(0.15 * E));
  const koValue = pko ? 4 : 2;
  const total = Math.max(guar, 10 * E + 20 * A);
  const koPool = koValue * E;
  const itmPool = total - koPool;
  const weights = Array.from({ length: P }, (_, i) => Math.pow(r, i));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const payouts = weights.map((w) => Math.round((itmPool * w) / wsum));
  payouts[0] += itmPool - payouts.reduce((a, b) => a + b, 0);
  return { places: P, total, koPool, itmPool, payouts, koValue };
}
