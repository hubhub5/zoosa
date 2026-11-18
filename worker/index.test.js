import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import worker, { verify, redact } from './src/index.js';

function fakeKV() {
  const m = new Map();
  return {
    m,
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  };
}
const SECRET = 'whsec_test';
const env = () => ({ KV: fakeKV(), GROBLE_SECRET: SECRET, SHAPES_KEY: 'sk', ALLOWED_ORIGIN: 'https://hubhub5.github.io' });
const REF = 'zs_abcdefghijklmnop1234';

function signed(body, { secret = SECRET, ts = Math.floor(Date.now() / 1000) } = {}) {
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  return new Request('https://w.dev/hook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-groble-signature': sig, 'x-groble-timestamp': String(ts) }, body: raw });
}
const check = (e, ref) => worker.fetch(new Request('https://w.dev/check', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://hubhub5.github.io' }, body: JSON.stringify({ ref }) }), e);

const completed = (ref = REF, uid = 'm_1') => ({
  id: 'evt_1', type: 'payment.completed', version: '2026-04-30', occurredAt: '2026-11-18T10:00:00+09:00',
  data: { object: { merchantUid: uid, sellerReference: ref, buyer: { type: 'MEMBER', displayName: '테스트 구매자', email: 'test@buyer.example', phoneNumber: '01012345678' }, content: { id: 'qhU2SP', title: '보호자 사주' }, pricing: { finalAmount: 9900, currency: 'KRW' } } },
});

describe('결제 확인 서버', () => {
  it('결제 → 확인 → 환불하면 다시 잠김', async () => {
    const e = env();
    expect((await (await check(e, REF)).json()).ok).toBe(false);
    expect(await (await worker.fetch(signed(completed()), e)).text()).toBe('saved');
    const r = await check(e, REF);
    expect(r.headers.get('access-control-allow-origin')).toBe('https://hubhub5.github.io');
    expect((await r.json()).ok).toBe(true);
    expect((await (await check(e, 'zs_someoneelse12345678')).json()).ok).toBe(false);
    const refunded = { id: 'evt_2', type: 'payment.refunded', data: { object: { merchantUid: 'm_1', refund: { amount: 9900 } } } };
    expect(await (await worker.fetch(signed(refunded), e)).text()).toBe('refunded');
    expect((await (await check(e, REF)).json()).ok).toBe(false);
  });
  it('서명이 틀리거나 오래된 알림은 거절', async () => {
    const e = env();
    expect((await worker.fetch(signed(completed(), { secret: 'wrong' }), e)).status).toBe(401);
    expect((await worker.fetch(signed(completed(), { ts: Math.floor(Date.now() / 1000) - 600 }), e)).status).toBe(401);
    expect((await (await check(e, REF)).json()).ok).toBe(false);
  });
  it('키 교체 중엔 이전 키 서명도 받는다', async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const raw = '{}';
    const h = new Headers({ 'x-groble-timestamp': ts, 'x-groble-signature': 'nope', 'x-groble-signature-previous': createHmac('sha256', 'old').update(`${ts}.${raw}`).digest('hex') });
    expect(await verify(h, raw, 'old')).toBe(true);
  });
  it('사이트를 안 거친 결제(참조값 없음)는 기록 안 함', async () => {
    const e = env();
    const b = completed(); delete b.data.object.sellerReference;
    expect(await (await worker.fetch(signed(b), e)).text()).toBe('ignored: no ref');
    expect([...e.KV.m.keys()].some((k) => k.startsWith('paid:'))).toBe(false);
  });
  it('키 넣기 전이면 503 (그로블이 나중에 다시 보냄)', async () => {
    const e = env(); delete e.GROBLE_SECRET;
    expect((await worker.fetch(signed(completed()), e)).status).toBe(503);
  });
  it('저장된 것에 이름·이메일·전화번호가 없다', async () => {
    const e = env();
    await worker.fetch(signed(completed()), e);
    const all = JSON.stringify([...e.KV.m.entries()]);
    expect(all).not.toMatch(/테스트 구매자|test@buyer|01012345678/);
    expect(JSON.stringify(redact(completed()))).toMatch(/zs_abcdefghijklmnop1234/);
  });
});
