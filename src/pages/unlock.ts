import { initCommon } from '../common';
import '../styles/form.css';
import { tryUnlock, isUnlocked, lastReport } from '../unlock';
import { CONFIG } from '../config';

initCommon();
const f = document.querySelector<HTMLFormElement>('[data-code-form]')!;
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


const say = (ok: boolean, t: string) => { msg.className = `ul-msg mono ${ok ? 'ok' : 'no'}`; msg.textContent = t; };

/** 코드가 맞으면 열고 리포트로 보낸다 */
async function openWith(v: string) {
  const r = await tryUnlock(v);
  if (r === 'nostore') {
    msg.className = 'ul-msg mono no';
    msg.textContent = '코드는 맞는데 이 브라우저가 저장을 막고 있어요. 시크릿 창이나 앱 안 브라우저면 크롬·사파리로 열어서 다시 넣어 주세요.';
    return;
  }
  if (r === 'ok') {
    msg.className = 'ul-msg mono ok';
    msg.textContent = '열렸어요. 리포트로 갈게요.';
    setTimeout(goReport, 700);
  } else {
    say(false, '코드가 안 맞아요. 오타 없는지 한 번만 봐 주세요.');
    input.select();
  }
}

f.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v) { say(false, '코드부터 넣어 주세요.'); return; }
  void openWith(v);
});

// 결제했어요: 결제 확인 서버에 이메일·전화번호로 물어본다
if (CONFIG.paidApi) {
  document.querySelector<HTMLElement>('[data-paid]')!.hidden = false;
  document.querySelector<HTMLElement>('[data-nocode]')!.innerHTML = `코드 없어도 돼요. <a class="wl" href="${CONFIG.grobleUrl}" target="_blank" rel="noopener">그로블에서 결제</a>하고 위 칸에 결제할 때 쓴 이메일이나 번호를 넣으면 열려요.`;
  const pf = document.querySelector<HTMLFormElement>('[data-paid-form]')!;
  const pin = pf.querySelector<HTMLInputElement>('input')!;
  const pbtn = pf.querySelector<HTMLButtonElement>('button')!;
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = pin.value.trim();
    if (!id) { say(false, '결제할 때 쓴 이메일이나 휴대폰 번호를 넣어 주세요.'); return; }
    pbtn.disabled = true;
    say(true, '결제 확인하는 중이에요.');
    try {
      const res = await fetch(`${CONFIG.paidApi}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await res.json() as { ok: boolean; code?: string; error?: string };
      if (j.ok && j.code) await openWith(j.code);
      else if (j.error === 'format') say(false, '이메일이나 010으로 시작하는 번호로 넣어 주세요.');
      else if (j.error === 'many') say(false, '여러 번 시도해서 잠깐 막혔어요. 10분 뒤에 다시 해 주세요.');
      else say(false, `결제 내역이 아직 안 보여요. 결제 직후면 1분쯤 뒤에 다시 눌러 주세요. 계속 안 되면 ${CONFIG.contact}로 결제 내역 캡처를 보내 주세요.`);
    } catch {
      say(false, `결제 확인 서버에 연결이 안 돼요. 잠시 뒤 다시 해 보시고, 계속 안 되면 ${CONFIG.contact}로 알려 주세요.`);
    } finally {
      pbtn.disabled = false;
    }
  });
}

// 그로블 결제 후 링크(?code=)로 들어오면 버튼 안 눌러도 바로 열고 리포트로 보낸다
const pre = new URLSearchParams(location.search).get('code');
if (pre) {
  input.value = pre;
  f.requestSubmit();
}
