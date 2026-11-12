import { initCommon } from '../common';
import '../styles/form.css';
import { tryUnlock, isUnlocked, lastReport } from '../unlock';
import { CONFIG } from '../config';

initCommon();
const f = document.querySelector<HTMLFormElement>('.ul-form')!;
const msg = document.querySelector<HTMLParagraphElement>('.ul-msg')!;
const input = f.querySelector<HTMLInputElement>('input')!;
document.querySelector<HTMLAnchorElement>('[data-buy]')!.href = CONFIG.grobleUrl;
document.querySelector('[data-contact]')!.textContent = CONFIG.contact;

const goReport = () => {
  const last = lastReport();
  location.href = last ? `./report.html#${last}` : './#form';
};

if (isUnlocked()) {
  msg.className = 'ul-msg mono ok';
  msg.innerHTML = '이미 열려 있어요. <a class="wl" href="#" data-go>리포트로 돌아가기</a>';
  msg.querySelector('[data-go]')!.addEventListener('click', (e) => { e.preventDefault(); goReport(); });
}

// 그로블 전달 링크에 ?code= 를 붙여 두면 자동 입력
const pre = new URLSearchParams(location.search).get('code');
if (pre) input.value = pre;

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v) { msg.className = 'ul-msg mono no'; msg.textContent = '코드부터 넣어 주세요.'; return; }
  const ok = await tryUnlock(v);
  if (ok) {
    msg.className = 'ul-msg mono ok';
    msg.textContent = '열렸어요. 리포트로 갈게요.';
    setTimeout(goReport, 700);
  } else {
    msg.className = 'ul-msg mono no';
    msg.textContent = '코드가 안 맞아요. 오타 없는지 한 번만 봐 주세요.';
    input.select();
  }
});
