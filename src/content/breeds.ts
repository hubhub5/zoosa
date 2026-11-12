// pixel/breeds.mjs 에서 생성 (견종 · 털색 이름만). 견종을 바꾸면 다시 생성
export interface BreedColor { id: string; name: string }
export interface Breed { id: string; name: string; colors: BreedColor[] }
export const BREED_LIST: Breed[] = [
  { id: 'maltese', name: '말티즈', colors: [{ id: 'std', name: '기본' }] },
  { id: 'poodle', name: '푸들', colors: [{ id: 'brown', name: '갈색' }, { id: 'apricot', name: '크림' }, { id: 'white', name: '흰색' }, { id: 'black', name: '검정' }, { id: 'red', name: '레드' }] },
  { id: 'pomeranian', name: '포메라니안', colors: [{ id: 'orange', name: '오렌지' }, { id: 'cream', name: '크림' }, { id: 'white', name: '흰색' }, { id: 'black', name: '검정' }] },
  { id: 'bichon', name: '비숑', colors: [{ id: 'std', name: '기본' }] },
  { id: 'shihtzu', name: '시츄', colors: [{ id: 'brown', name: '갈색 · 흰색' }, { id: 'black', name: '검정 · 흰색' }, { id: 'gold', name: '골드' }] },
  { id: 'chihuahua', name: '치와와', colors: [{ id: 'fawn', name: '황갈색' }, { id: 'cream', name: '크림' }, { id: 'chocolate', name: '초코' }, { id: 'blacktan', name: '블랙탄' }] },
  { id: 'corgi', name: '웰시 코기', colors: [{ id: 'red', name: '레드' }, { id: 'tri', name: '트라이' }] },
  { id: 'shiba', name: '시바', colors: [{ id: 'red', name: '적색' }, { id: 'sesame', name: '참깨' }, { id: 'blacktan', name: '블랙탄' }, { id: 'cream', name: '크림' }] },
  { id: 'jindo', name: '진돗개', colors: [{ id: 'white', name: '백구' }, { id: 'yellow', name: '황구' }, { id: 'black', name: '흑구' }, { id: 'brindle', name: '호구' }] },
  { id: 'golden', name: '골든 리트리버', colors: [{ id: 'gold', name: '골드' }, { id: 'light', name: '라이트' }, { id: 'red', name: '레드' }] },
  { id: 'labrador', name: '래브라도', colors: [{ id: 'yellow', name: '옐로' }, { id: 'black', name: '블랙' }, { id: 'chocolate', name: '초코' }] },
  { id: 'dachshund', name: '닥스훈트', colors: [{ id: 'red', name: '레드' }, { id: 'blacktan', name: '블랙탄' }, { id: 'cream', name: '크림' }] },
  { id: 'yorkie', name: '요크셔테리어', colors: [{ id: 'std', name: '기본' }] },
  { id: 'frenchie', name: '프렌치 불독', colors: [{ id: 'fawn', name: '폰' }, { id: 'cream', name: '크림' }, { id: 'brindle', name: '브린들' }, { id: 'pied', name: '파이드' }] },
  { id: 'schnauzer', name: '슈나우저', colors: [{ id: 'saltpepper', name: '솔트앤페퍼' }, { id: 'blacksilver', name: '블랙실버' }, { id: 'black', name: '검정' }, { id: 'white', name: '흰색' }] },
  { id: 'beagle', name: '비글', colors: [{ id: 'tri', name: '트라이' }, { id: 'lemon', name: '레몬' }] },
  { id: 'bordercollie', name: '보더 콜리', colors: [{ id: 'black', name: '흑백' }, { id: 'red', name: '레드' }, { id: 'blue', name: '블루멀' }] },
  { id: 'samoyed', name: '사모예드', colors: [{ id: 'std', name: '기본' }] },
  { id: 'mix', name: '믹스', colors: [{ id: 'cream', name: '크림' }, { id: 'brown', name: '갈색' }, { id: 'yellow', name: '황구' }, { id: 'white', name: '흰색' }, { id: 'black', name: '검정' }, { id: 'spot', name: '얼룩' }, { id: 'grey', name: '회색' }] },
];
export type BreedId = string;

export const findBreed = (id: string) => BREED_LIST.find((b) => b.id === id) ?? BREED_LIST.find((b) => b.id === 'mix')!;
/** 견종 + 털색 표시 이름. 털색이 하나뿐이면 견종만 */
export function breedName(id: string, color?: string) {
  const b = findBreed(id);
  if (b.colors.length < 2) return b.name;
  const c = b.colors.find((x) => x.id === color) ?? b.colors[0];
  return `${b.name} · ${c.name}`;
}
/** 존재하는 조합으로 맞춤 */
export function normalize(id: string, color?: string | null): { breed: string; color: string } {
  const b = findBreed(id);
  const c = b.colors.find((x) => x.id === color) ?? b.colors[0];
  return { breed: b.id, color: c.id };
}
/** 예전 링크 값 호환: mix-cream, cream, shiba 등 */
export function fromLegacy(f: string): { breed: string; color: string } {
  const coat: Record<string, string> = { cream: 'cream', brown: 'brown', white: 'white', black: 'black', spot: 'spot', grey: 'grey' };
  if (f.startsWith('mix-')) return normalize('mix', f.slice(4));
  if (coat[f]) return normalize('mix', coat[f]);
  return normalize(f);
}
