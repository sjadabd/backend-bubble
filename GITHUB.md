# GitHub — Backend (Bubble API)

## يُرفع للمستودع (نعم)

- كل ملفات `src/`
- `package.json` / `bun.lock` (أو `package-lock.json`)
- `tsconfig.json`
- `.env.example`
- `.gitignore`
- ملفات التوثيق إن وُجدت (`README.md`)

## لا يُرفع أبداً (لا)

| ملف / مجلد | السبب |
|------------|--------|
| `.env` | أسرار حقيقية (JWT, Mongo, Google, bootstrap) |
| `node_modules/` | يُثبَّت بـ `bun install` |
| `dist/` / `out/` / `coverage/` | مخرجات بناء |
| `uploads/` / `tmp/` | ملفات محلية |
| `.idea/` / `.vscode/` (شخصي) / `.DS_Store` | إعدادات الجهاز |

## رفع الصور (إنتاج)

في `.env` على السيرفر:

```env
PUBLIC_API_URL=https://api.bubble-iq.com
```

ترحيل الصور القديمة من base64 إلى ملفات:

```bash
cd /opt/bubble/backend
bun run migrate:uploads:dry   # معاينة
bun run migrate:uploads       # تنفيذ
systemctl restart bubble-backend
```

nginx لـ `api.bubble-iq.com` يجب أن يمرّر `/uploads/` و`/admin/uploads` إلى المنفذ 3001 (نفس `location /` الحالي يكفي).

## قبل أول رفع

```bash
cd backend
cp .env.example .env
# عدّل القيم السرية محلياً فقط — لا ترفع .env

git init
git add .
git status   # تأكد أن .env غير موجود في القائمة
git commit -m "chore: initial backend"
git branch -M main
git remote add origin https://github.com/USER/bubble-backend.git
git push -u origin main
```

## ملاحظة

في GitHub → Settings → Secrets ضع متغيرات الإنتاج (مثل `MONGODB_URI`, `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_ID`) ولا تضعها في الكود.
