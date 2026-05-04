import { CARD_POOL, type CardDef } from "../data/balance";

export function drawCards(count: number): CardDef[] {
  const pool = [...CARD_POOL];
  const drawn: CardDef[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool[idx];
    if (card) {
      drawn.push(card);
      pool.splice(idx, 1);
    }
  }
  return drawn;
}
