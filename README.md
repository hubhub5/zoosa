# 보호자사주

보호자의 대운(10년 단위) 위에 반려견 입양일을 찍어 보는 리포트. 정적 사이트(GitHub Pages) + 그로블 결제 + 해제코드.

## 판매 전에 할 일

1. **그로블 상품 만들기** (디지털 콘텐츠, 9,900원)
   - 전달 내용(구매자에게 보이는 안내)에 아래 두 줄을 넣는다.
     ```
     해제 링크: https://<아이디>.github.io/<레포>/unlock.html?code=<코드>
     코드: <코드>
     ```
   - 링크에 `?code=`를 붙이면 입력칸이 미리 채워진다.
2. **코드 바꾸기**: 코드 원문은 저장소에 절대 적지 않는다(해시만). 코드를 바꿀 때:
   ```
   node scripts/hash-code.mjs 새코드
   ```
   나온 해시를 `src/config.ts`의 `unlockHashes`에 넣는다.
3. **`src/config.ts` 채우기**: `grobleUrl`(상품 주소), `contact`(문의 메일), `seller`(판매자 이름).
4. **배포**: GitHub에 올리고 Settings → Pages → Source를 "GitHub Actions"로. `main`에 push하면 테스트 → 빌드 → 배포.
   - 커스텀 도메인을 쓰면 `.github/workflows/pages.yml`의 `SITE_URL`을 도메인으로 바꾼다 (OG 이미지 절대 주소용).

## 코드 교체 주기

- 정적 사이트라 코드가 공유되거나 JS를 뜯어보면 열릴 수 있다. 9,900원 상품에서는 감수하고, 한 달에 한 번쯤 코드를 바꾼다.
- 바꿀 때는 새 해시를 **추가**하고 예전 해시는 2~4주 뒤에 지운다. 이미 해제한 브라우저도 예전 해시를 지우면 다시 잠기므로, 잠긴 구매자 문의가 오면 새 코드를 보내 준다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | 만세력·리포트 테스트 (무작위 입력 300건 렌더링 포함) |
| `npm run lint` | AI 문체 검사 (`scripts/lint-tone.mjs`) |
| `npm run build` | 문체 검사 후 `dist/` 빌드 |
| `npm run pixel` | 픽셀 GIF 다시 그리기 (`pixel/build.mjs`) |
| `npm run norms` | 인지왜곡 분위 기준표 다시 만들기 (계산식을 바꿨을 때) |

OG 이미지(`public/og.png`)는 글꼴이 들어가서 브라우저에서 만든다: `npm run dev` 후 `/scripts/og.html`을 열면 저장된다.

## 구조

- `src/saju/` 만세력(lunar-javascript 래퍼, 진태양시 −30분, 1954–61 표준시, 서머타임), 십성·오행·신강도·운 점수
- `src/engine/adoption.ts` 입양한 해·달의 운으로 계기 7갈래 점수
- `src/engine/distortion.ts` 원국 비중 → 인지왜곡 10종 원점수 → `norms.json`(2만 명 분위)
- `src/content/` 문구 데이터. 문장을 길게 늘리지 말고 칸에 맞는 짧은 말로
- `src/report/` 모델 조립과 HTML 렌더링
- `pixel/` 도형 → 픽셀 엔진과 스프라이트 정의

## 문구 원칙

긴 줄글 대신 고정 양식: 숫자, 단어, 실제 말투의 대사, 장면. 느낌표·이모지·'여정'·'특별한 인연' 같은 표현은 `npm run lint`가 막는다.

## 견종 · 털색 추가하기

1. `pixel/breeds.mjs`
   - 새 견종: `BREEDS`에 한 줄 (몸·머리·귀·꼬리 모양, 기본 색, 무늬)
   - 털색: `COLORS[견종]`에 추가. 첫 번째가 기본. 무늬가 견종 특징이면 `marks`, `ear`까지 같이 바꾼다
2. `node pixel/sheet.mjs` → `pixel/preview/breeds.png`에서 전 조합 확인
3. `npm run pixel` (GIF 다시 만들기)
4. `src/content/breeds.ts`는 `pixel/breeds.mjs`의 이름 목록과 같게 맞춘다 (견종 id, 털색 id, 이름)
