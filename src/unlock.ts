import { CONFIG } from './config';

const KEY = 'zoosa.unlock';
const LAST = 'zoosa.last';

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

/** 공백·하이픈 유무와 대소문자를 무시한다. ABCDE1234, abcde 1234 → ABCDE-1234 */
export function normCode(code: string): string {
  const t = code.trim().toUpperCase().replace(/[\s\-‐-―−_.]+/g, '');
  const m = /^([A-Z]{5})(\d{4})$/.exec(t);
  return m ? `${m[1]}-${m[2]}` : code.trim().toUpperCase().replace(/\s+/g, '');
}

export async function hashCode(code: string): Promise<string> {
  const norm = normCode(code);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zoosa:' + norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 'ok' | 'wrong' | 'nostore'(코드는 맞는데 브라우저가 저장을 막음) */
export async function tryUnlock(code: string): Promise<'ok' | 'wrong' | 'nostore'> {
  const h = await hashCode(code);
  if (!CONFIG.unlockHashes.includes(h)) return 'wrong';
  store.set(KEY, h);
  return store.get(KEY) === h ? 'ok' : 'nostore';
}

export const isUnlocked = () => {
  const h = store.get(KEY);
  return !!h && CONFIG.unlockHashes.includes(h);
};

export const rememberReport = (hash: string) => store.set(LAST, hash);
export const lastReport = () => store.get(LAST);
