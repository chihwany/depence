import { CARD_POOL, type CardDef } from "../data/balance";

function drawFromPool(pool: CardDef[], count: number): CardDef[] {
  const work = [...pool];
  const drawn: CardDef[] = [];
  for (let i = 0; i < count && work.length > 0; i++) {
    const idx = Math.floor(Math.random() * work.length);
    const card = work[idx];
    if (card) {
      drawn.push(card);
      work.splice(idx, 1);
    }
  }
  return drawn;
}

export function drawCards(count: number): CardDef[] {
  return drawFromPool(CARD_POOL, count);
}

// First pick of the match — only towers and shapes so the player gets
// something immediately actionable. Buffs (Upgrade, Power Up) and
// Repair are excluded because they have nothing to act on yet.
export function drawStarterCards(count: number): CardDef[] {
  const starterPool = CARD_POOL.filter(
    (c) => c.effect.kind === "addTower" || c.effect.kind === "addShape",
  );
  return drawFromPool(starterPool, count);
}
