// 보호자사주 결제 확인 서버 (Cloudflare Workers)
//
// 흐름: 사이트가 리포트마다 랜덤 참조값(zs_...)을 만들어 그로블 결제 링크 뒤에 ?ref= 로 붙인다
//   → 결제되면 그로블이 웹훅(payment.completed)에 그 값을 sellerReference 로 돌려준다
//   → 서버가 "이 참조값 결제됨"을 기록한다
//   → 결제 후 이동 페이지로 돌아온 사이트가 /check 로 물어보고 그 리포트를 연다
//
// POST /hook                 그로블 웹훅 (X-Groble-Signature 로 진짜인지 확인)
// POST /check  {ref}         결제됐는지
// GET  /shapes/<SHAPES_KEY>  최근 웹훅 모양(개인정보 가림). 연결 확인용
//
// 비밀값(wrangler secret put): GROBLE_SECRET (그로블 웹훅 등록 때 받은 키), SHAPES_KEY
// 설정값(wrangler.toml [vars]): ALLOWED_ORIGIN
// 이름·이메일·전화번호는 저장하지 않는다.

const JSONH = { 'content-type': 'application/json; charset=utf-8' };
const REF_RE = /^zs_[A-Za-z0-9_-]{16,64}$/;
const YEAR = 60 * 60 * 24 * 365;

export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req, env) });
      if (req.method === 'POST' && p === '/hook') return await hook(req, env);
      if (req.method === 'POST' && p === '/check') return await check(req, env);
      if (req.method === 'GET' && env.SHAPES_KEY && p === `/shapes/${env.SHAPES_KEY}`) return await shapes(env);
      if (p === '/') return new Response('ok');
      return new Response('not found', { status: 404 });
    } catch {
      // 500 이면 그로블이 다시 보내 준다
      return new Response(JSON.stringify({ ok: false, error: 'server' }), { status: 500, headers: { ...JSONH, ...cors(req, env) } });
    }
  },
};

/* ---------- 그로블 → 서버 ---------- */

async function hook(req, env) {
  const raw = await req.text();
  if (!env.GROBLE_SECRET) return new Response('secret not set', { status: 503 }); // 키 넣기 전이면 나중에 다시 보내게
  if (!(await verify(req.headers, raw, env.GROBLE_SECRET))) return new Response('bad signature', { status: 401 });

  const ev = JSON.parse(raw);
  const o = ev?.data?.object ?? {};
  await env.KV.put(`shape:${Date.now()}`, JSON.stringify(redact(ev)), { expirationTtl: 60 * 60 * 24 * 14 });

  const uid = typeof o.merchantUid === 'string' ? o.merchantUid : '';
  if (ev.type === 'payment.completed') {
    const ref = typeof o.sellerReference === 'string' ? o.sellerReference : '';
    if (!REF_RE.test(ref)) return new Response('ignored: no ref'); // 다른 상품이거나 사이트를 안 거친 결제
    await env.KV.put(`paid:${ref}`, JSON.stringify({ uid, at: ev.occurredAt ?? '' }), { expirationTtl: YEAR * 3 });
    if (uid) await env.KV.put(`uid:${uid}`, ref, { expirationTtl: YEAR * 3 });
    return new Response('saved');
  }
  if (ev.type === 'payment.refunded') {
    // 환불 알림에는 참조값이 안 와서, 결제 때 적어 둔 merchantUid 로 찾는다
    const ref = uid ? await env.KV.get(`uid:${uid}`) : null;
    if (ref) await env.KV.delete(`paid:${ref}`);
    return new Response(ref ? 'refunded' : 'ignored: unknown uid');
  }
  return new Response('ignored: ' + String(ev.type));
}

/** HMAC-SHA256(secret, `${timestamp}.${raw}`) hex. 키 교체 중엔 이전 키 서명도 받는다. 5분 넘은 요청은 거절 */
export async function verify(headers, raw, secret, now = Date.now()) {
  const ts = headers.get('x-groble-timestamp') || '';
  if (!/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const want = await hmac(secret, `${ts}.${raw}`);
  return [headers.get('x-groble-signature'), headers.get('x-groble-signature-previous')]
    .some((s) => s && safeEq(s.trim().toLowerCase().replace(/^sha256=/, ''), want));
}

/* ---------- 사이트 → 서버 ---------- */

async function check(req, env) {
  const h = { ...JSONH, ...cors(req, env) };
  let ref = '';
  try { ref = String((await req.json()).ref || ''); } catch { /* 빈 값 */ }
  if (!REF_RE.test(ref)) return new Response(JSON.stringify({ ok: false, error: 'format' }), { status: 400, headers: h });
  const paid = await env.KV.get(`paid:${ref}`);
  return new Response(JSON.stringify({ ok: !!paid }), { headers: h });
}

async function shapes(env) {
  const list = await env.KV.list({ prefix: 'shape:' });
  const out = [];
  for (const k of list.keys.slice(-10)) out.push({ at: new Date(Number(k.name.slice(6))).toISOString(), body: JSON.parse(await env.KV.get(k.name)) });
  return new Response(JSON.stringify(out, null, 2), { headers: JSONH });
}

/* ---------- 도우미 ---------- */

/** 값은 가리고 키 이름과 종류만 남긴다. 상태·상품·참조값처럼 개인정보가 아닌 칸만 그대로 */
export function redact(v, key = '') {
  if (v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 5).map((x) => redact(x, key));
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x, `${key}.${k}`)]));
  if (typeof v === 'number' || typeof v === 'boolean') return typeof v;
  const s = String(v);
  if (/buyer|shipping|question|paymentMethod/i.test(key)) return `<가림 ${s.length}자>`;
  if (/(^\.type|version|occurredAt|merchantUid|sellerReference|content\.(id|type|title|paymentType)|currency)$/i.test(key)) return s;
  return `<글자 ${s.length}자>`;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function cors(req, env) {
  const o = req.headers.get('origin') || '';
  const ok = (env.ALLOWED_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean);
  return ok.includes(o) || o.startsWith('http://localhost:')
    ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
    : {};
}
