import { initCommon } from '../common';
import '../styles/form.css';
import { encodeInputs, decodeInputs, type Inputs } from '../report/model';
import { BREED_LIST, findBreed } from '../content/breeds';
import { lastReport } from '../unlock';
import { Lunar } from 'lunar-javascript';

initCommon();


const f = document.querySelector<HTMLFormElement>('.fm')!;
const bh = f.querySelector<HTMLSelectElement>('[name=bh]')!, bmin = f.querySelector<HTMLSelectElement>('[name=bmin]')!;
for (let h = 0; h < 24; h++) bh.add(new Option(`${String(h).padStart(2, '0')}시`, String(h)));
for (let m = 0; m < 60; m += 5) bmin.add(new Option(`${String(m).padStart(2, '0')}분`, String(m)));
const syncMin = () => { bmin.disabled = bh.value === ''; };
bh.addEventListener('change', syncMin); syncMin();

// 견종 → 털색 2단계 선택
const coats = f.querySelector('.coats')!;
const art = document.getElementById('land-art') as HTMLImageElement;
const breeds = BREED_LIST.filter((b) => b.id !== 'mix');
const mix = findBreed('mix');
const breedTile = (b: (typeof BREED_LIST)[number]) => `<label><input type="radio" name="breed" value="${b.id}"${b.id === 'mix' ? ' checked' : ''}><img class="px" src="./px/dog-${b.id}-${b.colors[0].id}.gif" width="84" height="72" alt="" loading="lazy"><span>${b.name}</span></label>`;
coats.innerHTML = `<p class="coat-h mono">견종</p>${breeds.map(breedTile).join('')}${breedTile(mix)}`;
const colorBox = document.createElement('div');
colorBox.className = 'coats colors';
colorBox.setAttribute('role', 'radiogroup');
coats.after(colorBox);

function renderColors(breedId: string, color?: string) {
  const b = findBreed(breedId);
  const pick = b.colors.find((c) => c.id === color) ?? b.colors[0];
  if (b.colors.length < 2) {
    colorBox.innerHTML = `<input type="hidden" name="color" value="${pick.id}"><p class="coat-h mono">털색 · ${b.name}${((b.name.charCodeAt(b.name.length - 1) - 0xac00) % 28) ? '은' : '는'} 사실상 한 가지 색이라 고를 게 없어요</p>`;
  } else {
    colorBox.innerHTML = `<p class="coat-h mono">털색 · ${b.name}</p>` + b.colors.map((c) => `<label><input type="radio" name="color" value="${c.id}"${c.id === pick.id ? ' checked' : ''}><img class="px" src="./px/dog-${b.id}-${c.id}.gif" width="84" height="72" alt=""><span>${c.name}</span></label>`).join('');
  }
  art.src = `./px/scene-${b.id}-${pick.id}.gif`;
}
coats.addEventListener('change', (e) => renderColors((e.target as HTMLInputElement).value));
colorBox.addEventListener('change', (e) => {
  const b = (f.querySelector('[name=breed]:checked') as HTMLInputElement).value;
  art.src = `./px/scene-${b}-${(e.target as HTMLInputElement).value}.gif`;
});
renderColors('mix');

// 이전 입력 복원
const prev = lastReport();
const old = prev ? decodeInputs(prev) : null;
if (old) fill(old);

function fill(i: Inputs) {
  const set = (n: string, v: string) => { const el = f.querySelector<HTMLInputElement>(`[name=${n}]`); if (el) el.value = v; };
  set('owner', i.owner); set('by', String(i.birth.y)); set('bm', String(i.birth.m)); set('bd', String(i.birth.d));
  bh.value = i.birth.hh === null ? '' : String(i.birth.hh); syncMin();
  if (i.birth.mm !== null) bmin.value = String(Math.floor(i.birth.mm / 5) * 5);
  const cal = i.birth.calendar === 'solar' ? 's' : i.birth.leap ? 'L' : 'l';
  f.querySelector<HTMLInputElement>(`[name=cal][value=${cal}]`)!.checked = true;
  f.querySelector<HTMLInputElement>(`[name=g][value=${i.birth.gender}]`)!.checked = true;
  set('dog', i.dog); set('ay', String(i.adopt.y)); set('am', String(i.adopt.m)); set('ad', i.adopt.d ? String(i.adopt.d) : '');
  const c = f.querySelector<HTMLInputElement>(`[name=breed][value=${i.breed}]`); if (c) { c.checked = true; renderColors(i.breed, i.color); }
  (f.querySelector('[name=route]') as HTMLSelectElement).value = i.route;
  (f.querySelector('[name=sick]') as HTMLInputElement).checked = i.sick;
  set('dby', i.dogBirthYear ? String(i.dogBirthYear) : '');
}

const err = f.querySelector<HTMLParagraphElement>('.fm-err')!;
f.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(f);
  const n = (k: string) => Number(String(fd.get(k) ?? '').trim());
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const now = new Date();
  const fail = (msg: string, name: string) => { err.textContent = msg; f.querySelector<HTMLElement>(`[name=${name}]`)?.focus(); return false; };
  const by = n('by'), bm = n('bm'), bd = n('bd');
  const validDate = (y: number, m: number, d: number) => { const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
  const cal = s('cal');
  if (!(by >= 1930 && by <= now.getFullYear())) return fail('태어난 연도 한 번만 확인해 주세요. (1930년 이후)', 'by');
  if (!(bm >= 1 && bm <= 12)) return fail('태어난 월이 이상해요.', 'bm');
  if (cal === 's' && !validDate(by, bm, bd)) return fail('태어난 날짜가 이상해요.', 'bd');
  if (cal !== 's') {
    if (!(bd >= 1 && bd <= 30)) return fail('음력 날짜가 이상해요.', 'bd');
    try { Lunar.fromYmd(by, cal === 'L' ? -bm : bm, bd).getSolar(); } catch { return fail(cal === 'L' ? '그해엔 그 달 윤달이 없어요.' : '음력 날짜가 이상해요.', 'bd'); }
  }
  const dog = s('dog');
  if (!dog) return fail('우리 개 이름은 꼭 넣어 주세요.', 'dog');
  const ay = n('ay'), am = n('am'), adRaw = s('ad'), ad = adRaw ? Number(adRaw) : null;
  if (!(ay >= by && ay <= now.getFullYear())) return fail('데려온 연도가 이상해요.', 'ay');
  if (!(am >= 1 && am <= 12)) return fail('데려온 월이 이상해요.', 'am');
  if (ad !== null && !validDate(ay, am, ad)) return fail('데려온 날짜가 이상해요. 모르면 비워 둬도 돼요.', 'ad');
  if (new Date(ay, am - 1, ad ?? 1) > now) return fail('데려온 날이 미래예요.', 'ay');
  const dby = s('dby') ? n('dby') : null;
  if (dby !== null && !(dby >= 1990 && dby <= now.getFullYear())) return fail('우리 개 태어난 해가 이상해요.', 'dby');
  err.textContent = '';
  const inp: Inputs = {
    owner: s('owner'),
    birth: { y: by, m: bm, d: bd, hh: s('bh') === '' ? null : n('bh'), mm: s('bh') === '' ? null : n('bmin'), calendar: cal === 's' ? 'solar' : 'lunar', leap: cal === 'L', gender: s('g') === 'm' ? 'm' : 'f' },
    dog, breed: s('breed') || 'mix', color: s('color'),
    adopt: { y: ay, m: am, d: ad },
    route: s('route') as Inputs['route'], sick: fd.get('sick') === 'on', dogBirthYear: dby,
  };
  location.href = `./report.html#${encodeInputs(inp)}`;
  return true;
});
