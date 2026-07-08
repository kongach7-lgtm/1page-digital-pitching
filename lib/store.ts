import { randomUUID } from "crypto";
import type { Entry, SiteConfig, Vote } from "./types";

type Store = {
  entries: Map<string, Entry>;
  entriesByStudentId: Map<string, string>;
  votes: Map<string, Vote>;
  votedStudentIds: Set<string>;
  roster: Map<string, string>; // studentId -> name, uploaded by instructor
  config: SiteConfig;
  // เปลี่ยนค่าทุกครั้งที่ reset session — ฝั่งนักศึกษาใช้เทียบเพื่อรู้ว่าต้อง login ใหม่
  sessionId: string;
};

export function defaultConfig(): SiteConfig {
  return {
    projectName: "1-Page Digital Pitching",
    tagline: "ส่งไอเดียธุรกิจของคุณ แล้วโหวตให้เพื่อน",
    fieldLabels: ["ชื่อไอเดีย/แบรนด์", "ปัญหาที่แก้ไข", "ราคาขาย"],
    submitTimer: { durationSeconds: 0, startedAt: null },
    voteTimer: { durationSeconds: 0, startedAt: null },
    awardCount: 3,
  };
}

// เหลือกี่วินาที ณ ตอนนี้ (null = ยังไม่เริ่ม, 0 = หมดเวลาแล้ว)
export function remainingSeconds(timer: { durationSeconds: number; startedAt: number | null }): number | null {
  if (!timer.startedAt) return null;
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, Math.ceil(timer.durationSeconds - elapsed));
}

function createStore(): Store {
  return {
    entries: new Map(),
    entriesByStudentId: new Map(),
    votes: new Map(),
    votedStudentIds: new Set(),
    roster: new Map(),
    config: defaultConfig(),
    sessionId: randomUUID(),
  };
}

const globalForStore = globalThis as unknown as { __pitchingStore?: Store };

export const store: Store = globalForStore.__pitchingStore ?? createStore();
globalForStore.__pitchingStore = store;

export function getVoteCount(entryId: string): number {
  let count = 0;
  for (const vote of store.votes.values()) {
    if (vote.entryId === entryId) count++;
  }
  return count;
}

// O(entries + votes) instead of calling getVoteCount per entry (O(entries * votes)) —
// matters once submissions scale into the hundreds.
export function getVoteCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const vote of store.votes.values()) {
    counts.set(vote.entryId, (counts.get(vote.entryId) ?? 0) + 1);
  }
  return counts;
}
