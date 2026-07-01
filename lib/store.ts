import type { Entry, Vote } from "./types";

type Store = {
  entries: Map<string, Entry>;
  entriesByStudentId: Map<string, string>;
  votes: Map<string, Vote>;
  votedStudentIds: Set<string>;
  roster: Map<string, string>; // studentId -> name, uploaded by instructor
};

function createStore(): Store {
  return {
    entries: new Map(),
    entriesByStudentId: new Map(),
    votes: new Map(),
    votedStudentIds: new Set(),
    roster: new Map(),
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
