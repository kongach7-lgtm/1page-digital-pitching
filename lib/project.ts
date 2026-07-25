import { db } from "./db";

export type ProjectRow = {
  id: number;
  teacher_id: number;
  project_code: string;
  project_name: string;
  tagline: string;
  field_label_1: string;
  field_label_2: string;
  field_label_3: string;
  award_count: number;
  session_id: string;
  submit_timer_duration: number;
  submit_timer_started_at: number | null;
  vote_timer_duration: number;
  vote_timer_started_at: number | null;
  created_at: string;
};

export type PhaseTimer = { durationSeconds: number; startedAt: number | null };

export type ProjectConfig = {
  projectName: string;
  tagline: string;
  fieldLabels: [string, string, string];
  submitTimer: PhaseTimer;
  voteTimer: PhaseTimer;
  awardCount: number;
  sessionId: string;
};

export function toConfig(row: ProjectRow): ProjectConfig {
  return {
    projectName: row.project_name,
    tagline: row.tagline,
    fieldLabels: [row.field_label_1, row.field_label_2, row.field_label_3],
    submitTimer: { durationSeconds: row.submit_timer_duration, startedAt: row.submit_timer_started_at },
    voteTimer: { durationSeconds: row.vote_timer_duration, startedAt: row.vote_timer_started_at },
    awardCount: row.award_count,
    sessionId: row.session_id,
  };
}

export function remainingSeconds(timer: PhaseTimer): number | null {
  if (!timer.startedAt) return null;
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, Math.ceil(timer.durationSeconds - elapsed));
}

export function getOwnedProject(teacherId: number, id: string | number): ProjectRow | undefined {
  return db
    .prepare("SELECT * FROM projects WHERE id = ? AND teacher_id = ?")
    .get(id, teacherId) as ProjectRow | undefined;
}

export function getProjectByCode(code: string): ProjectRow | undefined {
  return db
    .prepare("SELECT * FROM projects WHERE project_code = ?")
    .get(code) as ProjectRow | undefined;
}

export function getVoteCounts(projectId: number): Map<number, number> {
  const rows = db
    .prepare("SELECT entry_id, COUNT(*) c FROM votes WHERE project_id = ? GROUP BY entry_id")
    .all(projectId) as { entry_id: number; c: number }[];
  return new Map(rows.map((r) => [r.entry_id, r.c]));
}
