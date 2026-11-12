// 판매 설정. 여기만 바꾸면 된다.
export const CONFIG = {
  /** 그로블 상품 페이지 주소 (상품 등록 후 교체) */
  grobleUrl: 'https://www.groble.im/',
  price: 9900,
  priceLabel: '9,900원',
  /**
   * 해제코드의 SHA-256 해시 목록. 코드 원문은 여기에 두지 않는다.
   * 새 코드 만들기: node scripts/hash-code.mjs 새코드
   * 코드를 바꿀 때는 기존 해시를 바로 지우지 말고 2~4주 함께 둔다.
   */
  unlockHashes: [
    'c69ffe436842c481d625c1d1103456c33ea7a900dda3753d4775b29524fb06f3', // 2026-11 코드 (원문은 판매자만 보관)
  ],
  contact: 'hello@example.com',
  seller: '판매자 이름(상호)',
  brand: '견주사주',
};
