import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export async function sha256(message: string): Promise<string> {
  const hash = nobleSha256(strToBytes(message));
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function formatDate(ts: string | number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${y}年${m}月${day}日 星期${wd} ${h}:${min}`;
}
