import { initCommon } from '../common';
import { decodeInputs, buildModel, type Model } from '../report/model';
import { renderReport, esc, josa } from '../report/render';
import { wireCharts } from '../charts/charts';
import { isUnlocked, rememberReport } from '../unlock';
import { pillarHanja, STEMS, BRANCHES, EL_HANJA, EL_KO } from '../saju/constants';
import { ADOPT, ROUTE_KO } from '../content/adoption';
import { DIST } from '../content/distortions';
import { breedName } from '../content/breeds';

initCommon();

const root = document.getElementById('report')!;
// sample.html: 결제 후 화면을 보여주는 고정 예시 (가상의 보호자와 개)
const SAMPLE = document.body.hasAttribute('data-sample');
const SAMPLE_HASH = 'o=%EB%AF%BC%EC%A7%80&b=19930821&t=0920&c=s&g=f&n=%EC%BD%A9%EC%9D%B4&f=poodle&fc=brown&a=20200411&r=shop&s=&db=';
const hash = SAMPLE ? SAMPLE_HASH : location.hash.slice(1);
const inp = decodeInputs(hash);

if (!inp) {
  root.innerHTML = `<div class="page-head" style="margin-top:40px"><div class="kicker mono">입력 없음</div><h1>아직 입력한 게 없어요</h1><p>첫 화면에서 생일이랑 우리 개 온 날부터 넣어 주세요.</p></div><a class="btn" href="./#form">입력하러 가기</a>`;
} else {
  if (!SAMPLE) rememberReport(hash);
  const m = buildModel(inp);
  const unlocked = SAMPLE || isUnlocked();
  const { head, body, toc } = renderReport(m, unlocked);
  const bar = SAMPLE ? `<div class="sample-bar"><div><b>예시 리포트</b><span>결제하면 이렇게 끝까지 다 나와요. 아래는 가상의 보호자 민지님과 콩이 예시예요.</span></div><a class="btn" href="./#form">내 걸로 보기</a></div>` : '';
  root.innerHTML = bar + head + body + `<div class="disclaimer"><p>계산: 만세력(진태양시 −${m.chart.correctionMin}분 보정${m.chart.corrected ? '' : ', 시각 미상'}), 대운수 ${m.chart.daeunStartAge}. 생각 버릇 점수는 내 사주 비중을 무작위 생년월일 2만 개랑 비교해서 몇 등쯤인지 본 거예요.</p><p>재미로, 나를 좀 더 알아보는 용도로 봐 주세요. 심리 진단은 아니에요.</p></div>`;
  document.title = SAMPLE ? '예시 리포트 · 보호자사주' : `${inp.dog} · ${inp.owner || '보호자'}의 대운 리포트 · 보호자사주`;
  document.querySelector('[data-no]')!.textContent = `No.${m.reportNo}`;
  document.querySelector('[data-toc]')!.innerHTML = toc.map((t) => `<a href="#${t.id}" class="${t.locked ? 'lk' : ''}"><span class="mono">${t.no}</span>${esc(t.t)}</a>`).join('');
  const b = inp.birth;
  document.querySelector('[data-inp]')!.innerHTML = [
    ['보호자', inp.owner || '-'],
    ['생일', `${b.y}.${b.m}.${b.d} ${b.calendar === 'lunar' ? (b.leap ? '음(윤)' : '음') : '양'}`],
    ['시각', b.hh === null ? '모름' : `${String(b.hh).padStart(2, '0')}:${String(b.mm ?? 0).padStart(2, '0')}`],
    ['개', inp.dog],
    ['견종', breedName(inp.breed, inp.color)],
    [inp.dateKind === 'birth' ? '생일' : '온 날', `${inp.adopt.y}.${inp.adopt.m}${inp.adopt.d ? '.' + inp.adopt.d : ''}`],
    ['경로', ROUTE_KO[inp.route] ?? '-'],
  ].map(([k, v]) => `<li><span class="mono">${k}</span>${esc(v)}</li>`).join('');

  // 목차의 내부 링크가 해시(입력값)를 덮어쓰지 않도록
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#s-"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(a.getAttribute('href')!.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  wireCharts(root);
  wireChecks(m);
  wireShare(m, unlocked);
}

function wireChecks(m: Model) {
  const box = root.querySelector('.checks');
  if (!box) return;
  const key = `zoosa.chk.${hash.length}.${m.reportNo}`;
  const cnt = root.querySelector('[data-count]')!;
  const inputs = [...box.querySelectorAll<HTMLInputElement>('input')];
  try { const saved = JSON.parse(localStorage.getItem(key) ?? '[]'); inputs.forEach((i, k) => { i.checked = saved.includes(k); }); } catch { /* 무시 */ }
  const upd = () => {
    const on = inputs.filter((i) => i.checked).length;
    cnt.textContent = `${on} / ${inputs.length}`;
    try { localStorage.setItem(key, JSON.stringify(inputs.map((i, k) => (i.checked ? k : -1)).filter((k) => k >= 0))); } catch { /* 무시 */ }
  };
  box.addEventListener('change', upd); upd();
}

function wireShare(m: Model, paid: boolean) {
  const cv = root.querySelector<HTMLCanvasElement>('.share-c');
  if (!cv) return;
  const draw = async () => {
    await Promise.all([document.fonts.load('800 40px NanumSquareNeo'), document.fonts.load('400 20px NanumSquareNeo'), document.fonts.load('600 40px "Noto Serif KR"')]).catch(() => {});
    const img = new Image();
    img.src = `./px/scene-${m.inp.breed}-${m.inp.color}.gif`;
    await img.decode().catch(() => {});
    const x = cv.getContext('2d')!;
    const cs = getComputedStyle(document.documentElement);
    const C = (v: string) => cs.getPropertyValue(v).trim();
    const W = 1080, H = 1350, P = 84;
    x.fillStyle = '#efe7d8'; x.fillRect(0, 0, W, H);
    const ink = '#26211c', mute = '#8f8475', line = '#cdbfa8', acc = '#c2412b';
    x.strokeStyle = ink; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);
    const sans = (w: number, s: number) => `${w} ${s}px NanumSquareNeo, "Apple SD Gothic Neo", sans-serif`;
    const mono = (s: number) => `400 ${s}px NanumSquareNeo, sans-serif`;
    const sp = (t: string, px: number) => { (x as any).letterSpacing = `${px}px`; return t; };
    x.fillStyle = mute; x.font = mono(22); sp('', 0);
    x.fillText(`보호자사주 · REPORT No.${m.reportNo}`, P, 108);
    x.textAlign = 'right'; x.fillText(`${m.inp.adopt.y}.${String(m.inp.adopt.m).padStart(2, '0')} → D+${m.adoption.dPlus.toLocaleString()}`, W - P, 108); x.textAlign = 'left';
    x.beginPath(); x.moveTo(P, 132); x.lineTo(W - P, 132); x.strokeStyle = ink; x.lineWidth = 2; x.stroke();
    // 그림
    x.fillStyle = '#f7f2e7'; x.fillRect(P, 160, W - P * 2, 456);
    x.imageSmoothingEnabled = false;
    if (img.naturalWidth) { const s = Math.floor((W - P * 2 - 40) / img.naturalWidth); const iw = img.naturalWidth * s, ih = img.naturalHeight * s; x.drawImage(img, (W - iw) / 2, 160 + 456 - ih, iw, ih); }
    // 제목
    const du = m.daeunAtAdopt;
    x.fillStyle = ink; x.font = sans(800, 70); sp('', -4.9);
    x.fillText(josa(m.inp.dog, '은', '는'), P, 728);
    x.fillText(`${m.inp.owner ? m.inp.owner + '님' : '내'} ${du ? du.idx + '번째 대운' : '첫 대운 전'}에`, P, 812);
    x.fillText('왔다', P, 896);
    x.fillStyle = acc; x.fillRect(P, 920, 120, 8);
    // 사실 칸
    const facts: [string, string][] = [
      ['그해', `${pillarHanja(m.adoption.pillars.year)}년`],
      ['그때 나는', ADOPT[m.adoption.primary].tag],
      ['우리 개 기둥', pillarHanja(m.dogPillar)],
      ['채워준 기운', `${EL_KO[m.filled]} ${EL_HANJA[m.filled]}`],
    ];
    const cw = (W - P * 2) / 4;
    x.strokeStyle = line; x.lineWidth = 2;
    x.beginPath(); x.moveTo(P, 990); x.lineTo(W - P, 990); x.stroke();
    facts.forEach(([k, v], i) => {
      const fx = P + cw * i;
      if (!paid && i === 3) v = '· · ·';
      x.fillStyle = mute; x.font = mono(20); sp('', 0); x.fillText(k, fx, 1030);
      x.fillStyle = ink; x.font = /[一-鿿]/.test(v) ? '600 40px "Noto Serif KR", serif' : sans(800, 36); sp('', /[一-鿿]/.test(v) ? 0 : -2.5);
      x.fillText(v, fx, 1082);
    });
    // 원국 8글자
    x.beginPath(); x.moveTo(P, 1124); x.lineTo(W - P, 1124); x.stroke();
    const cols = [m.chart.hour, m.chart.day, m.chart.month, m.chart.year];
    x.fillStyle = mute; x.font = mono(20); sp('', 0); x.fillText('내 사주', P, 1164);
    x.font = '600 44px "Noto Serif KR", serif'; x.fillStyle = ink;
    cols.forEach((p, i) => { const fx = P + 120 + i * 92; x.fillText(p ? STEMS[p.s] : '·', fx, 1170); x.fillText(p ? BRANCHES[p.b] : '·', fx, 1226); });
    if (paid) {
      const d = DIST[m.dist[0].id];
      x.fillStyle = mute; x.font = mono(20); x.textAlign = 'right'; x.fillText('내 생각 버릇 1위', W - P, 1164);
      x.fillStyle = ink; x.font = sans(800, 44); sp('', -3); x.fillText(d.name, W - P, 1222); x.textAlign = 'left';
    } else {
      x.fillStyle = mute; x.font = mono(20); x.textAlign = 'right'; x.fillText('보호자사주', W - P, 1222); x.textAlign = 'left';
    }
    void C;
  };
  draw();
  document.addEventListener('themechange', draw);
  root.querySelector('[data-save]')?.addEventListener('click', () => {
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = `보호자사주-${m.inp.dog}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  });
  root.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    try { await navigator.clipboard.writeText(location.href); btn.textContent = '복사됨'; } catch { btn.textContent = '복사 실패'; }
    setTimeout(() => { btn.textContent = '결과 링크 복사'; }, 1600);
  });
}
