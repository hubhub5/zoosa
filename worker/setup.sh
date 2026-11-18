#!/bin/bash
# 결제 확인 서버 처음 설치. 먼저 npx -y wrangler@4.86.0 login 으로 Cloudflare 로그인해 둘 것.
set -euo pipefail
cd "$(dirname "$0")"
W="npx -y wrangler@4.86.0"
if grep -q REPLACE_ME wrangler.toml; then
  ID=$($W kv namespace create KV 2>&1 | grep -oE '[0-9a-f]{32}' | head -1)
  [ -n "$ID" ] || { echo "KV 만들기 실패"; exit 1; }
  sed -i '' "s/REPLACE_ME/$ID/" wrangler.toml
fi
$W deploy
# 웹훅 모양 확인 페이지 주소용 비밀값 (아무도 못 맞히게 랜덤)
node -e "process.stdout.write(require('crypto').randomBytes(12).toString('hex'))" > .shapes_key
$W secret put SHAPES_KEY < .shapes_key
echo
echo "끝. 위에 나온 https://zoosa-paid.....workers.dev 주소를 Claude에게 알려 주세요."
