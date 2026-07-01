export type Entry = {
  id: string;
  name: string;
  studentId: string;
  ideaName: string;
  problem: string;
  price: string;
  imageUrl: string;
  createdAt: number;
};

export type Vote = {
  id: string;
  entryId: string;
  voterStudentId: string;
  voterFingerprint: string;
  createdAt: number;
};

export type EntryWithVotes = Entry & { voteCount: number };
