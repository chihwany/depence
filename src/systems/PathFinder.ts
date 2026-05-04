import type { Grid, GridPosition } from "./Grid";

const PASSABLE = new Set<string>(["road", "spawn", "base"]);

export function findPath(
  grid: Grid,
  start: GridPosition,
  end: GridPosition,
): GridPosition[] | null {
  const startKey = key(start);
  const endKey = key(end);

  const queue: GridPosition[] = [start];
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    const curKey = key(cur);
    if (curKey === endKey) {
      const path: GridPosition[] = [];
      let k: string | undefined = curKey;
      while (k) {
        path.unshift(parseKey(k));
        k = parent.get(k);
      }
      return path;
    }
    for (const n of neighbors(cur)) {
      const cell = grid.getCell(n.col, n.row);
      if (!cell) continue;
      if (!PASSABLE.has(cell.type)) continue;
      const nKey = key(n);
      if (visited.has(nKey)) continue;
      visited.add(nKey);
      parent.set(nKey, curKey);
      queue.push(n);
    }
  }

  return null;
}

function key(p: GridPosition): string {
  return `${p.col},${p.row}`;
}

function parseKey(k: string): GridPosition {
  const [c, r] = k.split(",").map(Number);
  return { col: c ?? 0, row: r ?? 0 };
}

function neighbors(p: GridPosition): GridPosition[] {
  return [
    { col: p.col + 1, row: p.row },
    { col: p.col - 1, row: p.row },
    { col: p.col, row: p.row + 1 },
    { col: p.col, row: p.row - 1 },
  ];
}
