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

/* ---------- 자동 결제 확인 (그로블 웹훅 + ref) ---------- */
// 리포트마다 랜덤 참조값을 만들어 결제 링크에 붙이고, 결제되면 그 리포트만 연다

const REFS = 'zoosa.refs';   // { [리포트 해시]: 참조값 }
const PAID = 'zoosa.paid';   // [결제된 리포트 해시]
const PENDING = 'zoosa.pending'; // 결제하러 간 리포트 해시
const readJ = <T>(k: string, d: T): T => { try { return JSON.parse(store.get(k) ?? '') as T; } catch { return d; } };

export const autoPay = () => !!(CONFIG.groblePayUrl && CONFIG.paidApi);

export function refFor(report: string): string {
  const refs = readJ<Record<string, string>>(REFS, {});
  if (!refs[report]) {
    const b = crypto.getRandomValues(new Uint8Array(18));
    refs[report] = 'zs_' + btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    store.set(REFS, JSON.stringify(refs));
  }
  return refs[report];
}

/** 결제 버튼 주소. 자동 확인이 꺼져 있으면 상품 페이지 */
export function buyUrl(report: string): string {
  if (!autoPay()) return CONFIG.grobleUrl;
  const u = new URL(CONFIG.groblePayUrl);
  u.searchParams.set('ref', refFor(report));
  return u.toString();
}

export const markPending = (report: string) => store.set(PENDING, report);
export const pendingReport = () => store.get(PENDING);
export const hasRef = (report: string) => !!readJ<Record<string, string>>(REFS, {})[report];
export const isPaidReport = (report: string) => readJ<string[]>(PAID, []).includes(report);

/** 서버에 결제됐는지 물어보고, 됐으면 그 리포트를 열린 상태로 저장. 'ok' | 'no' | 'nostore' | 'error' */
export async function checkPaid(report: string): Promise<'ok' | 'no' | 'nostore' | 'error'> {
  if (!autoPay() || !hasRef(report)) return 'no';
  try {
    const r = await fetch(`${CONFIG.paidApi.replace(/\/$/, '')}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: refFor(report) }) });
    const j = await r.json() as { ok: boolean };
    if (!j.ok) return 'no';
  } catch { return 'error'; }
  const list = readJ<string[]>(PAID, []);
  if (!list.includes(report)) { list.push(report); store.set(PAID, JSON.stringify(list)); }
  return isPaidReport(report) ? 'ok' : 'nostore';
}
