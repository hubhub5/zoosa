import { describe, it, expect } from 'vitest';
import { normId, collectIds, isCancel, redact } from './src/index.js';

describe('결제 확인 서버', () => {
  it('이메일·전화번호를 같은 모양으로 맞춘다', () => {
    expect(normId(' Kim@Naver.com ')).toBe('kim@naver.com');
    expect(normId('010-1234-5678')).toBe('01012345678');
    expect(normId('+82 10 1234 5678')).toBe('01012345678');
    expect(normId('1234')).toBe('');
  });
  it('웹훅 본문 어디에 있든 구매자 연락처를 찾는다', () => {
    const body = { event: 'payment.completed', data: { buyer: { name: '홍길동', email: 'a@b.co', phone: '010-9999-0000' }, product: { id: 'qhU2SP' }, amount: 9900 } };
    expect(collectIds(body).sort()).toEqual(['01099990000', 'a@b.co']);
  });
  it('취소·환불 알림을 알아본다', () => {
    expect(isCancel({ event: 'payment.cancelled' })).toBe(true);
    expect(isCancel({ data: { status: '환불완료' } })).toBe(true);
    expect(isCancel({ event: 'payment.completed', memo: '환불 문의' })).toBe(false);
  });
  it('모양 기록에는 개인정보가 안 남는다', () => {
    const r = JSON.stringify(redact({ event: 'paid', buyer: { name: 'Kim', email: 'a@b.co', phone: '01099990000' }, product: { id: 'qhU2SP' } }));
    expect(r).not.toMatch(/Kim|a@b|0109999/);
    expect(r).toMatch(/qhU2SP/);
  });
});

import worker from './src/index.js';

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
const env = () => ({ KV: fakeKV(), HOOK_SECRET: 'sec', PAID_CODE: 'PAIDX-1111', ALLOWED_ORIGIN: 'https://hubhub5.github.io', PRODUCT_KEY: 'qhU2SP' });
const call = (e, path, body, ip = '1.1.1.1') => worker.fetch(new Request(`https://w.dev${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://hubhub5.github.io', 'cf-connecting-ip': ip }, body: JSON.stringify(body) }), e);

describe('결제 확인 흐름', () => {
  it('결제 알림 → 확인 → 취소', async () => {
    const e = env();
    const paid = { event: 'payment.completed', data: { buyer: { email: 'Kim@naver.com', phone: '010-1234-5678' }, product: { id: 'qhU2SP' } } };
    expect(await (await call(e, '/hook/sec', paid)).text()).toBe('saved');
    // 원문 이메일·번호는 저장 안 됨
    expect([...e.KV.m.keys()].join()).not.toMatch(/kim|0101234/);
    const r = await call(e, '/check', { id: '01012345678' });
    expect(r.headers.get('access-control-allow-origin')).toBe('https://hubhub5.github.io');
    expect(await r.json()).toEqual({ ok: true, code: 'PAIDX-1111' });
    expect(await (await call(e, '/check', { id: 'kim@NAVER.com' })).json()).toEqual({ ok: true, code: 'PAIDX-1111' });
    expect((await (await call(e, '/check', { id: 'other@naver.com' })).json()).ok).toBe(false);
    await call(e, '/hook/sec', { ...paid, event: 'payment.cancelled' });
    expect((await (await call(e, '/check', { id: '01012345678' })).json()).ok).toBe(false);
  });
  it('비밀 주소가 틀리거나 다른 상품이면 무시', async () => {
    const e = env();
    expect((await call(e, '/hook/wrong', { email: 'a@b.co', product: 'qhU2SP' })).status).toBe(404);
    expect(await (await call(e, '/hook/sec', { email: 'a@b.co', product: 'other' })).text()).toBe('ignored: product');
  });
  it('한 IP에서 10번 넘게 물으면 막는다', async () => {
    const e = env();
    for (let i = 0; i < 10; i++) await call(e, '/check', { id: 'a@b.co' });
    expect((await call(e, '/check', { id: 'a@b.co' })).status).toBe(429);
  });
});
