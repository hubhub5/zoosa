// AI 문체로 흐르기 쉬운 표현을 잡는다. 걸리면 빌드를 멈춘다.
// 검사 대상: src/content/*.ts 의 문자열, src/report/render.ts 의 한글 문자열, 루트 *.html 본문
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = [
  [/의 모든 것/, "'~의 모든 것'"],
  [/핵심은/, "'핵심은'"],
  [/중요합니다|중요하다/, "'중요하다'"],
  [/효과적(인|으로)/, "'효과적인'"],
  [/다양한/, "'다양한'"],
  [/해보세요|하세요!|보세요!/, '권유형 명령'],
  [/!/, '느낌표'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u, '이모지'],
  [/첫째|둘째|셋째/, '서수 나열'],
  [/놀라운|획기적|비결|꿀팁/, '과장 표현'],
  [/에 대해 알아보|살펴보겠|살펴봅시다/, '안내문 말투'],
  [/여정|특별한 인연|소중한 존재|운명적|진정한|마법 같은|선물 같은/, '감성 상투어'],
  [/것이 좋습니다|수 있습니다\.$|것입니다\.$/, '설명문 종결'],
  [/당신만의|나만의 특별/, "'~만의'"],
  [/깊이 있는|풍부한|탁월한|완벽한 가이드/, '광고 형용사'],
  [/결론적으로|요약하자면|무엇보다도|뿐만 아니라/, '접속 상투어'],
];

const items = [];
const lit = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const fromTs = (file) => {
  const src = readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  for (const m of src.matchAll(lit)) {
    const s = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]+>/g, ' ');
    if (/[가-힣]/.test(s)) items.push([file.replace(ROOT + '/', ''), s.trim()]);
  }
};
for (const f of readdirSync(join(ROOT, 'src/content'))) fromTs(join(ROOT, 'src/content', f));
{
  // 렌더러는 코드와 섞여 있으므로 태그 사이 글자와 작은따옴표 문자열만 본다
  const src = readFileSync(join(ROOT, 'src/report/render.ts'), 'utf8');
  for (const m of src.matchAll(/>([^<>{}`]*[가-힣][^<>{}`]*)</g)) items.push(['src/report/render.ts', m[1].trim()]);
  for (const m of src.matchAll(/'([^'\n]*[가-힣][^'\n]*)'/g)) items.push(['src/report/render.ts', m[1].trim()]);
}
for (const f of readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  const txt = readFileSync(join(ROOT, f), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/i, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n');
  for (const line of txt.split('\n')) if (/[가-힣]/.test(line)) items.push([f, line.trim()]);
}
for (const f of readdirSync(join(ROOT, 'partials'))) {
  const txt = readFileSync(join(ROOT, 'partials', f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n');
  for (const line of txt.split('\n')) if (/[가-힣]/.test(line)) items.push([`partials/${f}`, line.trim()]);
}

let bad = 0;
for (const [file, s] of items) for (const [re, label] of RULES) if (re.test(s)) { console.log(`✗ ${file}: ${label} — ${s.slice(0, 90)}`); bad++; }
if (bad) { console.log(`\n톤 린트: ${bad}건`); process.exit(1); }
console.log(`톤 린트: 통과 (${items.length}개 문자열)`);
