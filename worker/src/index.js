// 보호자사주 결제 확인 서버 (Cloudflare Workers)
//
// POST /hook/<HOOK_SECRET>   그로블 웹훅이 결제 알림을 보내는 곳
// POST /check                사이트가 "이 이메일/전화번호 결제했나요?" 묻는 곳
// GET  /shapes/<HOOK_SECRET> 최근 웹훅 모양(개인정보 가린 것) 보기. 처음 연결할 때 확인용
//
// 이메일·전화번호 원문은 저장하지 않는다. HOOK_SECRET 을 섞은 해시만 저장한다.
// 비밀값(wrangler secret put): HOOK_SECRET, PAID_CODE
// 설정값(wrangler.toml [vars]): ALLOWED_ORIGIN, PRODUCT_KEY

const JSONH = { 'content-type': 'application/json; charset=utf-8' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req, env) });
      if (req.method === 'POST' && p === `/hook/${env.HOOK_SECRET}`) return await hook(req, env);
      if (req.method === 'POST' && p === '/check') return await check(req, env);
      if (req.method === 'GET' && p === `/shapes/${env.HOOK_SECRET}`) return await shapes(env);
      if (p === '/') return new Response('ok');
      return new Response('not found', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'server' }), { status: 500, headers: { ...JSONH, ...cors(req, env) } });
    }
  },
};

/* ---------- 그로블 → 서버 ---------- */

async function hook(req, env) {
  const raw = await req.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = Object.fromEntries(new URLSearchParams(raw)); }

  // 처음 연결할 때 어떤 값이 오는지 보려고 모양만 남긴다 (개인정보는 가림, 7일 뒤 삭제)
  await env.KV.put(`shape:${Date.now()}`, JSON.stringify(redact(body)), { expirationTtl: 60 * 60 * 24 * 7 });

  // 다른 상품 알림이면 무시 (PRODUCT_KEY 가 비어 있으면 모든 상품을 받는다)
  if (env.PRODUCT_KEY && !raw.includes(env.PRODUCT_KEY)) return new Response('ignored: product');

  const ids = collectIds(body);
  if (!ids.length) return new Response('ignored: no buyer id');

  const cancelled = isCancel(body);
  for (const id of ids) {
    const k = `paid:${await sha(env.HOOK_SECRET + ':' + id)}`;
    if (cancelled) await env.KV.delete(k);
    else await env.KV.put(k, String(Date.now()));
  }
  return new Response(cancelled ? 'cancelled' : 'saved');
}

/* ---------- 사이트 → 서버 ---------- */

async function check(req, env) {
  const h = { ...JSONH, ...cors(req, env) };
  // 남의 번호로 결제 여부를 찔러 보는 걸 막는다: IP 하나당 10분에 10번
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const rk = `rl:${ip}:${Math.floor(Date.now() / 600000)}`;
  const n = Number((await env.KV.get(rk)) || 0);
  if (n >= 10) return new Response(JSON.stringify({ ok: false, error: 'many' }), { status: 429, headers: h });
  await env.KV.put(rk, String(n + 1), { expirationTtl: 900 });

  let id = '';
  try { id = normId(String((await req.json()).id || '')); } catch { /* 빈 값 */ }
  if (!id) return new Response(JSON.stringify({ ok: false, error: 'format' }), { status: 400, headers: h });

  const paid = await env.KV.get(`paid:${await sha(env.HOOK_SECRET + ':' + id)}`);
  return new Response(JSON.stringify(paid ? { ok: true, code: env.PAID_CODE } : { ok: false, error: 'notfound' }), { headers: h });
}

async function shapes(env) {
  const list = await env.KV.list({ prefix: 'shape:' });
  const out = [];
  for (const k of list.keys.slice(-10)) out.push({ at: new Date(Number(k.name.slice(6))).toISOString(), body: JSON.parse(await env.KV.get(k.name)) });
  return new Response(JSON.stringify(out, null, 2), { headers: JSONH });
}

/* ---------- 도우미 ---------- */

export function normId(s) {
  const t = s.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return t;
  let d = t.replace(/\D/g, '');
  if (d.startsWith('82')) d = '0' + d.slice(2);
  if (/^01\d{8,9}$/.test(d)) return d;
  return '';
}

/** 웹훅 본문 어디에 있든 이메일·휴대폰 번호를 다 찾는다 (그로블이 어떤 키 이름을 쓰는지 몰라도 되게) */
export function collectIds(body) {
  const out = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string' || typeof v === 'number') {
      const s = String(v);
      for (const m of s.match(/[^\s@"',;<>]+@[^\s@"',;<>]+\.[a-z]{2,}/gi) || []) { const n = normId(m); if (n) out.add(n); }
      for (const m of s.match(/(?:\+?82[-\s]?|0)1\d[-\s]?\d{3,4}[-\s]?\d{4}/g) || []) { const n = normId(m); if (n) out.add(n); }
      return;
    }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(body);
  return [...out];
}

/** status·event·type 같은 칸에 취소·환불이 적혀 있으면 취소 알림으로 본다 */
export function isCancel(body) {
  let hit = false;
  const walk = (v, key = '') => {
    if (hit || v == null) return;
    if (typeof v === 'object') { for (const [k, x] of Object.entries(v)) walk(x, k); return; }
    if (/status|event|type|state/i.test(key) && /cancel|refund|취소|환불/i.test(String(v))) hit = true;
  };
  walk(body);
  return hit;
}

/** 값은 가리고 키 이름과 종류만 남긴다 */
export function redact(v, key = '') {
  if (v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 5).map((x) => redact(x, key));
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x, `${key}.${k}`)]));
  if (typeof v === 'number' || typeof v === 'boolean') return typeof v;
  const s = String(v);
  if (/@/.test(s)) return '<이메일>';
  if (/^[\d\s+-]{9,}$/.test(s)) return `<숫자 ${s.replace(/\D/g, '').length}자리>`;
  // 상태·이벤트·상품 칸의 짧은 영문 값(paid, cancel, 상품 ID)만 그대로. 이름일 수 있는 건 가린다
  if (!/name|buyer|user|customer|member/i.test(key) && /status|event|type|state|product|item|code/i.test(key) && /^[A-Za-z0-9_.:-]{1,40}$/.test(s)) return s;
  return `<글자 ${s.length}자>`;
}

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function cors(req, env) {
  const o = req.headers.get('origin') || '';
  const ok = (env.ALLOWED_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean);
  return ok.includes(o) || o.startsWith('http://localhost:')
    ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
    : {};
}
