import type { Entry, Vote } from "./types";

type Store = {
  entries: Map<string, Entry>;
  entriesByStudentId: Map<string, string>;
  votes: Map<string, Vote>;
  votedStudentIds: Set<string>;
};

function createStore(): Store {
  return {
    entries: new Map(),
    entriesByStudentId: new Map(),
    votes: new Map(),
    votedStudentIds: new Set(),
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
