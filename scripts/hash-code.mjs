// 사용: node scripts/hash-code.mjs ABCDE-1234
// 출력된 해시를 src/config.ts 의 unlockHashes 에 넣는다.
import { createHash } from 'node:crypto';

const code = process.argv[2];
if (!code) { console.log('코드를 인자로 넣어 주세요. 예: node scripts/hash-code.mjs ABCDE-1234'); process.exit(1); }
const norm = code.trim().toUpperCase().replace(/\s+/g, '');
console.log(`${norm}\n${createHash('sha256').update('zoosa:' + norm).digest('hex')}`);
