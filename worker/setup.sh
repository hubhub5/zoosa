#!/bin/bash
# 결제 확인 서버 처음 설치. 먼저 npx wrangler login 으로 Cloudflare 로그인해 둘 것.
# 사용: bash worker/setup.sh <PAID_CODE 파일> <HOOK_SECRET 파일>
set -euo pipefail
cd "$(dirname "$0")"
W="npx -y wrangler@4.86.0"
if grep -q REPLACE_ME wrangler.toml; then
  ID=$($W kv namespace create KV 2>&1 | grep -oE '[0-9a-f]{32}' | head -1)
  [ -n "$ID" ] || { echo "KV 만들기 실패"; exit 1; }
  sed -i '' "s/REPLACE_ME/$ID/" wrangler.toml
fi
$W deploy
tr -d '\n' < "$1" | $W secret put PAID_CODE
tr -d '\n' < "$2" | $W secret put HOOK_SECRET
echo
echo "끝. 위에 나온 https://zoosa-paid.....workers.dev 주소를 Claude에게 알려 주세요."
