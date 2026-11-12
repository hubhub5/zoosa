import { CONFIG } from './config';

const KEY = 'zoosa.unlock';
const LAST = 'zoosa.last';

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

export async function hashCode(code: string): Promise<string> {
  const norm = code.trim().toUpperCase().replace(/\s+/g, '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zoosa:' + norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function tryUnlock(code: string): Promise<boolean> {
  const h = await hashCode(code);
  if (!CONFIG.unlockHashes.includes(h)) return false;
  store.set(KEY, h);
  return true;
}

export const isUnlocked = () => {
  const h = store.get(KEY);
  return !!h && CONFIG.unlockHashes.includes(h);
};

export const rememberReport = (hash: string) => store.set(LAST, hash);
export const lastReport = () => store.get(LAST);
