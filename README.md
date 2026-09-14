# 1-Page Digital Pitching Platform

เว็บแอปสำหรับกิจกรรม Active Learning ในคลาส: นักศึกษาส่งไอเดียธุรกิจ 1 หน้า พร้อมโหวตให้เพื่อน อาจารย์ดู leaderboard real-time และ export Excel ได้ทันที (ดูรายละเอียดฟีเจอร์ใน PRD)

## รันในเครื่อง (Development)

```
npm install
npm run dev
```

เปิด http://localhost:3000 — ต้องมีไฟล์ `.env.local` (คัดลอกจาก `.env.example`) พร้อมตั้งค่า `ADMIN_PASSCODE`, `JWT_SECRET`, `DATA_DIR` (ในเครื่องปล่อยเป็น `./data` ได้เลย มี `.gitignore` กันไว้แล้ว)

## Build สำหรับ Production

```
npm run build
npm start
```

## Deploy ขึ้น Railway (แนะนำ)

Railway รองรับ Next.js แบบ zero-config ข้อมูลทั้งหมด (ฐานข้อมูล SQLite + รูปภาพที่อัปโหลด) เก็บอยู่ในโฟลเดอร์เดียวตาม `DATA_DIR` — **ต้องผูก Railway Volume ไว้ที่ path เดียวกับ `DATA_DIR` เสมอ** ข้อมูลถึงจะอยู่ถาวรข้าม redeploy/restart ได้ (ถ้าไม่มี Volume ผูกไว้ ข้อมูลจะหายทุกครั้งที่ deploy เพราะ filesystem ของ container เป็นแบบ ephemeral)

1. สมัคร/ล็อกอิน https://railway.app ด้วยบัญชีของคุณเอง
2. สร้าง GitHub repo แล้ว push โค้ดโปรเจกต์นี้ขึ้นไป (หรือใช้ Railway CLI deploy ตรงจากเครื่องก็ได้โดยไม่ต้องผ่าน GitHub)
3. ใน Railway: New Project → Deploy from GitHub repo → เลือก repo นี้
4. ตั้งค่า Environment Variables: `ADMIN_PASSCODE`, `JWT_SECRET`, `DATA_DIR` (เช่น `/app/data`) — ดูตัวอย่างใน `.env.example`
5. คลิกขวาที่ service ในหน้า canvas ของ project → **Attach Volume** (หรือ Create Volume) → ตั้ง Mount Path ให้**ตรงกับค่า `DATA_DIR` ที่ตั้งไว้ในขั้นตอนก่อนหน้าเป๊ะๆ** (เช่น `/app/data`) — ทำครั้งเดียวตอน setup ครั้งแรก
6. Railway จะรัน `npm install` + `npm run build` + `npm start` ให้อัตโนมัติ (ตรวจสอบ Deploy Logs ว่าไม่มี error)
7. เมื่อ deploy สำเร็จจะได้ URL แบบ `https://xxxx.up.railway.app` — ใช้ URL นี้เป็น link เดียวให้อาจารย์ล็อกอิน (`/teacher/login`)

หลังจากตั้ง Volume ไว้แล้ว **deploy/redeploy ครั้งต่อๆ ไปจะไม่ทำให้ข้อมูลหาย** แก้โค้ดและ push ระหว่างทำกิจกรรมได้ตามปกติ

## Deploy ขึ้น Render (ทางเลือก)

1. สมัคร/ล็อกอิน https://render.com
2. New → Web Service → เชื่อมกับ GitHub repo นี้
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. ตั้งค่า Environment Variables: `ADMIN_PASSCODE`, `JWT_SECRET`, `DATA_DIR`
6. เพิ่ม **Persistent Disk** (Render's equivalent ของ Volume) แล้ว mount ไว้ที่ path เดียวกับ `DATA_DIR` — ไม่งั้นข้อมูลจะหายทุกครั้งที่ deploy เหมือนกับ Railway

## ข้อควรระวังตอน deploy

- **ต้องมี persistent volume/disk ผูกกับ `DATA_DIR` เสมอ** — ทั้งฐานข้อมูล SQLite และรูปภาพที่อัปโหลด เก็บอยู่ใต้โฟลเดอร์นี้ทั้งหมด (ดู `lib/db.ts`) ถ้าลืมผูก volume ตอน setup ครั้งแรก ข้อมูลจะหายทุกครั้งที่ redeploy — เช็คได้จาก Railway: service → Settings → พิมพ์ "volume" ในช่อง filter หรือดูในหน้า canvas ของ project ว่ามี volume node ต่ออยู่กับ service และ Mount Path ตรงกับ `DATA_DIR`
- **รองรับ 500 concurrent users + polling ทุก 5 วิ** ≈ 100 req/s บน endpoint entries (vote counting คำนวณแบบ O(entries + votes) ไม่ใช่ nested loop แล้ว) — ตัวแอปเองรับโหลดนี้ได้สบายบน Node process เดียว แต่ **แนะนำให้ตรวจสอบ CPU/RAM ของแผน Railway/Render ที่ใช้อยู่ด้วย** เพราะ resource ของ hosting plan (ไม่ใช่โค้ด) มักเป็นคอขวดจริงเมื่อ concurrent users เพิ่มขึ้น ถ้าเป็นแผนฟรี/starter ควรทดสอบ load ก่อนใช้งานจริงกับคลาสขนาดใหญ่
- **Secrets**: อย่า commit `.env.local` ขึ้น git (มีอยู่ใน `.gitignore` แล้ว) ตั้งค่า `ADMIN_PASSCODE`/`JWT_SECRET` ผ่าน Environment Variable บน hosting platform เท่านั้น
