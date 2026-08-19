# موقع تقديم طلب استخراج شهادات الميلاد الإلكتروني (PWA)
### Online Birth Certificate Issuance System - Progressive Web App

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-darkgreen?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/PWA-Ready-orange?logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/License-Academic-lightgrey" alt="License" />
</p>

موقع ويب تقدمي متكامل (**Full-Stack Progressive Web Application**) لإدارة وتقديم ومتابعة طلبات استخراج شهادات الميلاد إلكترونياً. صُمم النظام بهندسة معمارية تتيح العمل دون اتصال بالإنترنت (**Offline-First**) لتسهيل الخدمة على المواطنين والموظفين في بيئات الاتصال الضعيفة.

---

## ✨ المميزات الرئيسية (Core Features)

* **📱 تقنية الويب التقدمي (PWA):** قابل للتثبيت كتطبيق مستقل على الأجهزة المحمولة والحواسيب، مع دعم التخزين المؤقت والعمل دون اتصال عبر `Service Workers` و `IndexedDB`.
* **🔐 الأمان وإدارة الهوية:** تسجيل حسابات المستخدمين مع التحقق برمز لمرة واحدة (OTP) عبر البريد الإلكتروني (Brevo API)، وحماية المسارات بنظام الـ Tokens (`JWT`).
* **📋 دورة عمل الطلبات:** تقديم بيانات المواليد، رفع المرفقات الثبوتية، تتبع مسار الطلب لحظياً عبر رقم تتبع فريد.
* **💳 بوابة الدفع والتحويل البنكي:** إدارة عمليات السداد، رفع إيصالات التحويل، وتوليد إيصالات دفع إلكترونية معتمدة.
* **🛡️ التحكم في الوصول حسب الدور (RBAC):**
  * **بوابة المواطن (Client):** التقديم، التتبع، وإدارة الإيصالات محلياً.
  * **لوحة الموظفين (Staff):** مراجعة المرفقات واعتماد الطلبات أو رفضها.
  * **لوحة الإدارة (Admin):** إدارة الموظفين، إعدادات الدفع، وتوزيع الصلاحيات.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

| النطاق | التقنيات والمكتبات |
| :--- | :--- |
| **Frontend** | React.js, Vite, CSS, IndexedDB API, Service Workers |
| **Backend** | Node.js, Express.js, Multer (رفع الملفات), CORS |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Security & Auth** | JSON Web Tokens (JWT), Bcrypt.js, OTP Verification |
| **Communications** | Brevo API (Sendinblue) لإرسال رسائل البريد الإلكتروني |

---

## 📂 الهيكل العام للمشروع (Project Structure)

```text
birth_certificate_pwa/
├── client/                 # واجهة المستخدم (React + PWA)
│   ├── public/             # ملفات Manifest والـ Service Worker
│   ├── src/
│   │   ├── components/     # المكونات العامة وعناصر التنقل
│   │   ├── pages/          # شاشات المستخدم، الموظفين، ولوحات الإدارة
│   │   └── services/       # دوال الربط بالـ API وإدارة IndexedDB
│   └── package.json
│
├── backend/                # خادم الـ API (Node.js & Express)
│   ├── config/             # إعدادات الاتصال بقاعدة البيانات
│   ├── middleware/         # حماية المسارات وفحص الصلاحيات ورفع الملفات
│   ├── models/             # مخططات قواعد البيانات (Users, Requests, Otp)
│   ├── routes/             # مسارات الـ RESTful API
│   ├── utils/              # دوال توليد الإيصالات والتحقق
│   └── server.js           # نقطة الانطلاق الرئيسية للسيرفر
│
└── README.md


## التثبيت والتشغيل محلياً (Local Setup)
1. استنساخ المشروع:
Bash
git clone [https://github.com/harunbabekr/birth-certificate-pwa.git](https://github.com/harunbabekr/birth-certificate-pwa.git)
cd birth-certificate-pwa
2. إعداد وتشغيل خادم الباك إند (Backend):
Bash
cd backend
npm install
أنشئ ملف .env داخل مجلد backend وأضف المتغيرات التالية:

مقتطف الرمز
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/birth_db
JWT_SECRET=your_super_secret_jwt_key
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_email@domain.com
BREVO_SENDER_NAME="السجل المدني"
NODE_ENV=development
تشغيل السيرفر:

Bash
npm run dev
3. إعداد وتشغيل تطبيق الفرونت إند (Frontend):
Bash
cd ../client
npm install
npm run dev

