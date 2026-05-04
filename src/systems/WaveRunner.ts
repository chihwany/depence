import { ENEMIES, type EnemyStats, type WaveDef } from "../data/balance";

interface SpawnQueue {
  stats: EnemyStats;
  remaining: number;
  interval: number;
  nextTime: number;
}

export class WaveRunner {
  private queues: SpawnQueue[];
  readonly totalCount: number;

  constructor(wave: WaveDef, startTime: number) {
    this.queues = wave.spawns.map((s) => ({
      stats: ENEMIES[s.type],
      remaining: s.count,
      interval: s.interval,
      nextTime: startTime + (s.delay ?? 0),
    }));
    this.totalCount = wave.spawns.reduce((sum, s) => sum + s.count, 0);
  }

  tick(time: number): EnemyStats[] {
    const spawned: EnemyStats[] = [];
    for (const q of this.queues) {
      while (q.remaining > 0 && q.nextTime <= time) {
        spawned.push(q.stats);
        q.remaining--;
        q.nextTime += q.interval;
      }
    }
    return spawned;
  }

  isDone(): boolean {
    return this.queues.every((q) => q.remaining <= 0);
  }
}
