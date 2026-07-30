// Минимальный читатель ZIP — ровно столько, сколько нужно для выгрузок GG.
//
// Библиотеку тянуть не за чем: сам контейнер — это несколько заголовков с
// фиксированной раскладкой, а распаковкой занимается встроенный в браузер
// DecompressionStream("deflate-raw"). GG кладёт в архив плоский список .txt
// без папок и без шифрования, так что поддерживаются два метода хранения:
// 0 (без сжатия) и 8 (deflate).
//
// Читается ЦЕНТРАЛЬНЫЙ каталог, а не цепочка локальных заголовков: в локальном
// заголовке размеры могут быть нулями со ссылкой на data descriptor после
// данных, и тогда границу записи без каталога не найти.

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

export function isZip(buf: ArrayBuffer): boolean {
  const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  return ZIP_SIG.every((b, i) => head[i] === b);
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Смещение End of Central Directory. -1, если не нашлось. */
function findEocd(view: DataView): number {
  // Комментарий архива — до 64 КБ, поэтому сигнатуру ищем с конца.
  const min = Math.max(0, view.byteLength - 0xffff - 22);
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BufferSource]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Распаковывает архив. Записи, чей метод сжатия не поддержан, пропускаются. */
export async function readZip(buf: ArrayBuffer): Promise<ZipEntry[]> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const eocd = findEocd(view);
  if (eocd < 0) throw new Error("Это не ZIP-архив: не найден центральный каталог");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== CEN_SIG) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/")) continue; // каталог

    // Длины полей имени и extra в локальном заголовке свои — читаем их там.
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = bytes.subarray(start, start + compressedSize);

    if (method === 0) out.push({ name, data: raw });
    else if (method === 8) out.push({ name, data: await inflateRaw(raw) });
  }
  return out;
}

/**
 * Текстовые файлы историй из того, что дал пользователь: сам .txt или
 * все .txt из архива.
 */
export async function textsFrom(name: string, buf: ArrayBuffer): Promise<{ name: string; text: string }[]> {
  const decoder = new TextDecoder();
  if (!isZip(buf)) return [{ name, text: decoder.decode(buf) }];
  const entries = await readZip(buf);
  return entries
    .filter((e) => e.name.toLowerCase().endsWith(".txt"))
    .map((e) => ({ name: e.name, text: decoder.decode(e.data) }));
}
