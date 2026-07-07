export type Entry = {
  id: string;
  name: string;
  studentId: string;
  field1: string;
  field2: string;
  field3: string;
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

// อาจารย์กำหนดเองได้ต่อ session: ชื่อโปรเจกต์ที่แสดงให้นักศึกษาเห็น
// และ label ของ 3 หัวข้อที่นักศึกษาต้องกรอก (field1 คือหัวข้อหลัก/บังคับ ใช้เป็นชื่อบนการ์ดผลงาน)
export type SiteConfig = {
  projectName: string;
  tagline: string;
  fieldLabels: [string, string, string];
};
