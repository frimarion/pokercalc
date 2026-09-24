// ICM по Malmuth–Harville: стеки → ожидаемая выплата каждого игрока.
//
// Шанс занять первое место пропорционален стеку; дальше тот же принцип
// применяется к оставшимся. Перебор всех порядков вылета — n!, но значения
// зависят только от МНОЖЕСТВА оставшихся игроков, поэтому мемоизация по
// битовой маске даёт O(2ⁿ·n²): на 9 игроках это 41 тысяча операций.
//
// Игрок с нулевым стеком (вылетел в этой раздаче) первым не станет никогда и
// естественно получает последнее из разыгрываемых мест.

export function icmValues(stacks: number[], payouts: number[]): number[] {
  const n = stacks.length;
  const pay = (place: number) => payouts[place] ?? 0;
  const memo = new Map<number, Float64Array>();

  // Ожидаемые выплаты игроков маски, если места place.. разыгрываются между ними.
  function solve(mask: number, place: number): Float64Array {
    const hit = memo.get(mask);
    if (hit) return hit;
    const out = new Float64Array(n);
    let total = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        total += stacks[i];
        count++;
      }
    }
    if (count === 1) {
      for (let i = 0; i < n; i++) if (mask & (1 << i)) out[i] = pay(place);
    } else if (total <= 0) {
      // Все оставшиеся на нуле (вылетели одновременно) — места делятся поровну.
      let sum = 0;
      for (let k = 0; k < count; k++) sum += pay(place + k);
      for (let i = 0; i < n; i++) if (mask & (1 << i)) out[i] = sum / count;
    } else {
      for (let j = 0; j < n; j++) {
        if (!(mask & (1 << j)) || stacks[j] <= 0) continue;
        const p = stacks[j] / total;
        out[j] += p * pay(place);
        const rest = solve(mask & ~(1 << j), place + 1);
        for (let i = 0; i < n; i++) out[i] += p * rest[i];
      }
    }
    memo.set(mask, out);
    return out;
  }

  return Array.from(solve((1 << n) - 1, 0));
}
