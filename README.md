# 1-Page Digital Pitching Platform

เว็บแอปสำหรับกิจกรรม Active Learning ในคลาส: นักศึกษาส่งไอเดียธุรกิจ 1 หน้า พร้อมโหวตให้เพื่อน อาจารย์ดู leaderboard real-time และ export Excel ได้ทันที (ดูรายละเอียดฟีเจอร์ใน PRD)

## รันในเครื่อง (Development)

```
npm install
npm run dev
```

เปิด http://localhost:3000 — ต้องมีไฟล์ `.env.local` (คัดลอกจาก `.env.example`) พร้อมตั้งค่า `ADMIN_PASSCODE`

## Build สำหรับ Production

```
npm run build
npm start
```

## Deploy ขึ้น Railway (แนะนำ)

Railway รองรับ Next.js แบบ zero-config และให้ persistent process ที่เหมาะกับ in-memory store ของโปรเจกต์นี้ (ข้อมูลจะอยู่ตลอดจนกว่า container จะ restart/redeploy — ตรงตามดีไซน์ของระบบ)

1. สมัคร/ล็อกอิน https://railway.app ด้วยบัญชีของคุณเอง
2. สร้าง GitHub repo แล้ว push โค้ดโปรเจกต์นี้ขึ้นไป (หรือใช้ Railway CLI deploy ตรงจากเครื่องก็ได้โดยไม่ต้องผ่าน GitHub)
3. ใน Railway: New Project → Deploy from GitHub repo → เลือก repo นี้
4. ตั้งค่า Environment Variable: `ADMIN_PASSCODE=<รหัสผ่านที่ต้องการ>`
5. Railway จะรัน `npm install` + `npm run build` + `npm start` ให้อัตโนมัติ (ตรวจสอบ Deploy Logs ว่าไม่มี error)
6. เมื่อ deploy สำเร็จจะได้ URL แบบ `https://xxxx.up.railway.app` — ใช้ URL นี้เป็น link เดียวให้นักศึกษาเปิด

## Deploy ขึ้น Render (ทางเลือก)

1. สมัคร/ล็อกอิน https://render.com
2. New → Web Service → เชื่อมกับ GitHub repo นี้
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. ตั้งค่า Environment Variable: `ADMIN_PASSCODE=<รหัสผ่านที่ต้องการ>`

## ข้อควรระวังตอน deploy

- **ข้อมูลหายเมื่อ redeploy/restart** — เป็นดีไซน์ตั้งใจ (in-memory store, ไม่มี database) ต้องมั่นใจว่า deploy เสร็จและเสถียรก่อนเริ่มคลาส อย่า push โค้ดใหม่ระหว่างทำกิจกรรม
- **รูปภาพเก็บบน disk ของ container** — ถ้า deploy platform ใช้ ephemeral filesystem (เช่น redeploy ใหม่ทุกครั้งที่ push) ไฟล์รูปจะหายไปพร้อมกับ redeploy เช่นกัน ซึ่งสอดคล้องกับดีไซน์ session-based ของระบบ
- **200 concurrent users + polling ทุก 4 วิ** ≈ 50 req/s บน endpoint `/api/entries` — ทดสอบ load ก่อนใช้งานจริงกับคลาสขนาดใหญ่ถ้ากังวลเรื่อง performance
- **Passcode**: อย่า commit `.env.local` ขึ้น git (มีอยู่ใน `.gitignore` แล้ว) ตั้งค่าผ่าน Environment Variable บน hosting platform เท่านั้น
