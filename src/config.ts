// 판매 설정. 여기만 바꾸면 된다.
export const CONFIG = {
  /** 그로블 상품 페이지 주소  */
  grobleUrl: 'https://www.groble.im/payment/g4wFTv',
  price: 9900,
  priceLabel: '9,900원',
  /**
   * 해제코드의 SHA-256 해시 목록. 코드 원문은 여기에 두지 않는다.
   * 새 코드 만들기: node scripts/hash-code.mjs 새코드
   * 코드를 바꿀 때는 기존 해시를 바로 지우지 말고 2~4주 함께 둔다.
   */
  unlockHashes: [
    'c69ffe436842c481d625c1d1103456c33ea7a900dda3753d4775b29524fb06f3', // 2026-11 코드 (원문은 판매자만 보관)
    '586f6da8ffd73ee2b03c45fed62ac7e05f3cf2e8b1120dd71ae65d9d15f7dee0', // 2026-11 추가 코드 1
    '2c2b05ea5740d98bd6ab042c5afa776176d520d312756ced7364fa4f95c6a2df', // 2026-11 추가 코드 2
    '2bfa7682deb46a98852efc532fb9fa674b834aa97971e3aebfbda33f6fa8a131', // 2026-11 추가 코드 3
    '3cbb8c8f0f150809bbcca2b3c0a674081613dc74e91c5c0f3cdae1c85b320a48', // 2026-11 추가 코드 4
    'f28303cf5cf8a61588192d1a13b9f291cb17200b569c9973eb1a80a0a412e7a9', // 2026-11 추가 코드 5
  ],
  contact: 'study_4ever@naver.com',
  seller: '놀이댕산',
  brand: '보호자사주',
  /** 관리자 편집 페이지가 문구를 저장할 GitHub 저장소 */
  repo: 'hubhub5/zoosa',
  /**
   * 자동 결제 확인. 둘 다 채워야 켜진다 (비어 있으면 코드 방식만)
   * groblePayUrl: 그로블 결제창 링크 (상품 관리 → 링크 복사, groble.im/payment/...). 뒤에 ?ref= 를 붙여 보낸다
   * paidApi: 결제 확인 서버 주소 (worker/ 배포 후 나온 workers.dev 주소)
   * 그로블 '결제 후 이동 페이지'에는 https://hubhub5.github.io/zoosa/unlock.html?paid=1 을 넣는다
   */
  groblePayUrl: 'https://www.groble.im/payment/g4wFTv',
  paidApi: 'https://zoosa-paid.study-4ever.workers.dev',
};
