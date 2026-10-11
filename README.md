<div align="center">

# 🌐 MASTER TRANSLATION

### 📖 منصة ترجمة المانجا والمانهوا — Manga & Manhwa Translation Platform

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_App-success?logo=githubpages&logoColor=white)](https://masterv00-hub.github.io/master-translation/)

### ▶️ [افتح التطبيق مباشرة — Open Live App](https://masterv00-hub.github.io/master-translation/)

**ترجم صفحات المانجا والمانهوا بين العربية والإنجليزية بالذكاء الاصطناعي، مع حسابات ومكافآت ومتجر.**

**AI-powered manga/manhwa page translation between Arabic and English, with accounts, rewards and a store.**

</div>

---

<div align="center">

## 🌍 اختار اللغة — Choose Language

### [🇪🇬 العربية](#-النسخة-العربية) &nbsp;&nbsp;|&nbsp;&nbsp; [🇬🇧 English](#-english-version)

</div>

---

<a id="-النسخة-العربية"></a>

<div dir="rtl">

## 🇪🇬 النسخة العربية

### 📖 الفكرة

**Master Translation** منصة ويب لترجمة صور المانجا والمانهوا باستخدام **Gemini AI** — ارفع صورة الصفحة واستلم النص المستخرج والترجمة بصياغة منظمة. مع نظام حسابات كامل (تسجيل دخول، عملات، متجر، اشتراكات، لوحة إدارة) مدعوم بـ **Supabase**.

### ✨ المميزات

- 🖼️ ترجمة صفحات المانجا (استخراج + ترجمة بصيغة JSON منظمة)
- ✂️ محرر دمج الفصول (manga merger editor) وقارئ مانجا مدمج
- 🎨 تصميم أغلفة وأدوات رموز مخصصة
- 👤 حسابات ومصادقة، ملف شخصي، سجل نشاط
- 🪙 عملات ومكافآت يومية ومتجر وخطط اشتراك
- 🛠️ لوحة إدارة (مستخدمون، رسائل عامة، إعدادات)
- 🌍 واجهة عربية/إنجليزية كاملة مع دعم RTL وداكن/فاتح

### 🛠️ التقنيات

`React 19` • `Vite 7` • `TypeScript 5` • `Tailwind` • `react-router-dom` • `@google/genai` • `Supabase` • `Netlify Functions`

### 🚀 التشغيل محلياً

**المتطلبات:** `Node.js` (20+)

```bash
# 1. ثبّت الحزم
npm install

# 2. انسخ ملف البيئة واملأ القيم
cp .env.example .env.local

# 3. شغّل وضع التطوير
npm run dev

# 4. ابنِ نسخة الإنتاج
npm run build
```

### 📁 هيكل المشروع

```
master-translation/
├── App.tsx                  # الراوتر والشاشات الرئيسية
├── components/              # Home • Editor • Reader • Store • Admin • ...
├── services/
│   ├── geminiService.ts     # الترجمة عبر Gemini
│   ├── supabaseClient.ts    # عميل Supabase
│   └── symbolService.ts     # الرموز المخصصة
├── netlify/
│   ├── netlify.toml
│   └── functions/           # claim-coins • generate-token (تعمل على Netlify فقط)
├── public/                  # logo.png • discord.png • _redirects
├── index.html / index.tsx   # نقطة الدخول
└── vite.config.ts
```

### ⚠️ ملاحظة عن النسخة التجريبية

النسخة المعروضة على GitHub Pages **واجهة فقط (static)** — تسجيل الدخول والترجمة والعملات تحتاج backend حقيقي (Supabase + Netlify). للمزايا الكاملة انشر المشروع على Netlify مع ضبط متغيرات البيئة من `.env.example`.

### 🔑 صلاحية الإدارة

حساب المدير يُحدد بالبريد في `components/AdminView.tsx` و`components/Sidebar.tsx` (ابحث عن `admin@example.com` وضع بريدك).

<details>
<summary><b>🕰️ تاريخ تطور المشروع (10 إصدارات مدموجة في Git)</b></summary>

| الإصدار | التاريخ | الوصف |
|---|---|---|
| `v00` | 2025-09-13 | نموذج Express + واجهة Vanilla |
| `v01` | 2025-12-05 | إعادة الكتابة React + Vite + Gemini |
| `v02` | 2025-12-10 | واجهة ثنائية اللغة ودعم الثيمات |
| `v03` | 2025-12-12 | تحسين البرومبتات وبطاقات النتائج |
| `v04` | 2025-12-14 | مصادقة Supabase + متجر + دفع + بروفايل |
| `v05` | 2025-12-18 | لوحة الإدارة + خدمة الرموز + الأصول |
| `v06` | 2026-01-02 | الدعم + محرر الدمج + الأيقونات |
| `v07` | 2026-01-03 | نسخة مستقرة منقحة |
| `v08` | 2026-02-28 | الراوتر + Tailwind 4 + دوال Netlify + القارئ |
| `v09` | 2026-03-21 | السجل + مسار الكاشط + تحسينات المتجر |

كل إصدار محفوظ كـ commit بتاريخه الأصلي — استخدم `git log` لاستعراض الرحلة.

</details>

</div>

---

<a id="-english-version"></a>

## 🇬🇧 English Version

### 📖 Overview

**Master Translation** is a web platform for translating manga/manhwa page images with **Gemini AI** — upload a page image and get extracted text plus structured translation. Full account system (auth, coins, store, subscriptions, admin dashboard) backed by **Supabase**.

### ✨ Features

- 🖼️ Manga page translation (extraction + structured JSON translation)
- ✂️ Chapter merger editor + built-in manga reader
- 🎨 Cover designer + custom symbol tools
- 👤 Auth, profiles, activity history
- 🪙 Coins, daily rewards, store, subscription plans
- 🛠️ Admin dashboard (users, global messages, settings)
- 🌍 Full Arabic/English UI with RTL + dark/light mode

### 🛠️ Stack

`React 19` • `Vite 7` • `TypeScript 5` • `Tailwind` • `react-router-dom` • `@google/genai` • `Supabase` • `Netlify Functions`

### 🚀 Run Locally

**Prerequisites:** `Node.js` (20+)

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill values
cp .env.example .env.local

# 3. Start dev server
npm run dev

# 4. Build for production
npm run build
```

### 📁 Project Structure

```
master-translation/
├── App.tsx                  # Router & main screens
├── components/              # Home • Editor • Reader • Store • Admin • ...
├── services/
│   ├── geminiService.ts     # Translation via Gemini
│   ├── supabaseClient.ts    # Supabase client
│   └── symbolService.ts     # Custom symbols
├── netlify/
│   ├── netlify.toml
│   └── functions/           # claim-coins • generate-token (Netlify only)
├── public/                  # logo.png • discord.png • _redirects
├── index.html / index.tsx   # Entry point
└── vite.config.ts
```

### ⚠️ Demo Note

The GitHub Pages demo is **frontend-only (static)** — login, translation and coins need a real backend (Supabase + Netlify). For full features deploy to Netlify with env vars from `.env.example`.

### 🔑 Admin Access

The admin account is set by email in `components/AdminView.tsx` and `components/Sidebar.tsx` (search `admin@example.com` and put yours).

<details>
<summary><b>🕰️ Project evolution (10 versions merged in Git)</b></summary>

| Version | Date | Description |
|---|---|---|
| `v00` | 2025-09-13 | Express + vanilla prototype |
| `v01` | 2025-12-05 | React + Vite + Gemini rewrite |
| `v02` | 2025-12-10 | Bilingual UI + themes |
| `v03` | 2025-12-12 | Prompt polish + result cards |
| `v04` | 2025-12-14 | Supabase auth + store + payment + profile |
| `v05` | 2025-12-18 | Admin dashboard + symbols + assets |
| `v06` | 2026-01-02 | Support + merger editor + icons |
| `v07` | 2026-01-03 | Stable refined build |
| `v08` | 2026-02-28 | Router + Tailwind 4 + Netlify functions + reader |
| `v09` | 2026-03-21 | History + scraper route + store refinements |

Each version is preserved as a commit with its original date — run `git log` to walk the journey.

</details>

---

<div align="center">

### [⬆️ back to top / العودة للأعلى](#-master-translation)

MIT License — game assets and third-party services belong to their respective owners.

</div>
