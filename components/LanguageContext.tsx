import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageContextType, AppLanguage } from '../types';

const translations = {
  en: {
    appTitle: "MASTER TRANSLATOR",
    subtitle: "Upload raw Manga/Manhwa pages (or a ZIP file).\nAI extracts text and translates it using strict Scanlation formatting.",
    uploadTitle: "Click to upload Images or ZIP",
    uploadDesc: "JPG, PNG, WEBP, or ZIP archive containing images",
    pagesLoaded: "Pages Loaded",
    clear: "Clear",
    useSymbols: "Use Symbols",
    copyAll: "Copy Translation",
    copyAllExtracted: "Copy Extracted",
    translateAll: "Translate All Pending",
    translate: "Translate",
    retranslate: "Retranslate",
    retry: "Retry",
    done: "Done",
    queued: "Queued",
    processing: "Translating...",
    waitingCooldown: "Rate limit: Waiting...",
    error: "Error",
    extracted: "Extracted Text",
    translated: "Translation",
    targetLang: "Target Language",
    noImages: "No images uploaded yet.",
    copySuccess: "Copied to clipboard!",
    unzipError: "Failed to unzip file",
    unknownError: "An unknown error occurred",
    analyzing: "Analyzing visuals and translating...",
    instructions: "Instructions",
    close: "Close",
    instructionsContent: "1- Maximum image height must be 15,000 pixels.\n2- Total size of all images must not exceed 10 MB.",
    // Sidebar & Navigation
    navHome: "Home",
    navProfile: "Profile",
    navStore: "Store",
    toggleMenu: "Toggle Menu",
    // Store
    sectionSubscriptions: "Subscriptions",
    sectionPacks: "Credit Packs",
    planPro: "Pro",
    planProMax: "Pro Max",
    planMaster: "Master",
    pack25: "Starter Pack",
    pack50: "Standard Pack",
    pack100: "Ultimate Pack",
    duration1Month: "1 Month",
    duration2Months: "2 Months",
    duration3Months: "3 Months",
    credits25: "25 Images",
    credits50: "50 Images",
    credits100: "100 Images",
    featureUnlimited: "Unlimited Translation & Extraction",
    featureMoreLangs: "More Languages",
    featureSymbols1: "Add 1 Symbol Name",
    featureSymbols2: "Add 2 Symbol Names",
    featureSymbols3: "Add 3 Symbol Names",
    featurePack25: "Translate 25 Images",
    featurePack50: "Translate 50 Images",
    featurePack100: "Translate 100 Images",
    featureNoExpiry: "No Expiration Date",
    subscribe: "Subscribe",
    buyNow: "Buy Now",
    storeTitle: "Choose Your Plan",
    storeSubtitle: "Unlock unlimited power or top up credits",
    // Payment
    paymentTitle: "Complete Your Purchase",
    paymentMethod: "Payment Method",
    noPaymentMethod: "No payment method saved",
    vodafoneCash: "Vodafone Cash",
    binance: "Binance",
    sendTo: "Send amount to:",
    uploadReceipt: "Upload Transfer Receipt",
    confirmPayment: "Confirm Payment",
    backToStore: "Back to Store",
    paymentSubmitted: "Payment submitted successfully! Waiting for approval.",
    // Profile
    profileTitle: "User Profile",
    currentPlan: "Current Plan",
    planFree: "Free",
    creditsBalance: "Credits Balance",
    credits: "Credits",
    accountStatus: "Active",
    upgradeNow: "Upgrade Now",
    userName: "Manga Reader",
    // Auth
    loginTitle: "Welcome Back",
    loginDesc: "Sign in to save your progress and manage your subscription.",
    signInGoogle: "Sign in with Google",
    signInDiscord: "Sign in with Discord",
    guestUser: "Guest User",
    guestEmail: "guest@example.com",
    logOut: "Log out",
    loggingOut: "Logging out..."
  },
  ar: {
    appTitle: "MASTER TRANSLATOR",
    subtitle: "ارفع صفحات المانجا/المانهوا (أو ملف ZIP).\nالذكاء الاصطناعي يستخرج النص ويترجمه باستخدام تنسيق الفصول الدقيق.",
    uploadTitle: "اضغط لرفع الصور أو ملف ZIP",
    uploadDesc: "JPG, PNG, WEBP, أو ملف مضغوط يحتوي على صور",
    pagesLoaded: "صفحات تم تحميلها",
    clear: "مسح الكل",
    useSymbols: "استخدام الرموز",
    copyAll: "نسخ الترجمة",
    copyAllExtracted: "نسخ النص الأصلي",
    translateAll: "ترجمة الكل",
    translate: "ترجمة",
    retranslate: "إعادة الترجمة",
    retry: "إعادة المحاولة",
    done: "تم",
    queued: "في الانتظار",
    processing: "جاري الترجمة...",
    waitingCooldown: "الحد الأقصى: انتظار...",
    error: "خطأ",
    extracted: "النص المستخرج",
    translated: "الترجمة",
    targetLang: "لغة الترجمة",
    noImages: "لم يتم رفع صور بعد.",
    copySuccess: "تم النسخ للحافظة!",
    unzipError: "فشل فك ضغط الملف",
    unknownError: "حدث خطأ غير معروف",
    analyzing: "جاري تحليل الصور والترجمة...",
    instructions: "التعليمات",
    close: "إغلاق",
    instructionsContent: "1- عليك رفع الصور بطول 15000 بكسل كحد اقصى\n2- يجب على مساحه جميع الصور الا تتعدا 10 ميجا بايت",
    // Sidebar & Navigation
    navHome: "الرئيسية",
    navProfile: "الملف الشخصي",
    navStore: "المتجر",
    toggleMenu: "القائمة",
    // Store
    sectionSubscriptions: "الاشتراكات",
    sectionPacks: "باقات النقاط",
    planPro: "برو",
    planProMax: "برو ماكس",
    planMaster: "ماستر",
    pack25: "باقة البداية",
    pack50: "باقة قياسية",
    pack100: "باقة المحترفين",
    duration1Month: "شهر واحد",
    duration2Months: "شهرين",
    duration3Months: "3 أشهر",
    credits25: "25 صورة",
    credits50: "50 صورة",
    credits100: "100 صورة",
    featureUnlimited: "ترجمة واستخراج غير محدود",
    featureMoreLangs: "لغات أكثر",
    featureSymbols1: "إضافة اسم واحد للرموز",
    featureSymbols2: "إضافة اسمين للرموز",
    featureSymbols3: "إضافة 3 أسماء للرموز",
    featurePack25: "ترجمة 25 صورة",
    featurePack50: "ترجمة 50 صورة",
    featurePack100: "ترجمة 100 صورة",
    featureNoExpiry: "صلاحية مدى الحياة",
    subscribe: "اشتراك",
    buyNow: "شراء الآن",
    storeTitle: "اختر خطتك",
    storeSubtitle: "افتح قفل الميزات أو اشحن نقاطك",
    // Payment
    paymentTitle: "إتمام الشراء",
    paymentMethod: "طريقة الدفع",
    noPaymentMethod: "لا توجد طريقة دفع محفوظة",
    vodafoneCash: "فودافون كاش",
    binance: "باينانس",
    sendTo: "قم بتحويل المبلغ إلى:",
    uploadReceipt: "رفع صورة التحويل",
    confirmPayment: "تأكيد الدفع",
    backToStore: "عودة للمتجر",
    paymentSubmitted: "تم إرسال طلب الدفع بنجاح! في انتظار الموافقة.",
    // Profile
    profileTitle: "الملف الشخصي",
    currentPlan: "الخطة الحالية",
    planFree: "مجاني",
    creditsBalance: "رصيد النقاط",
    credits: "نقطة",
    accountStatus: "نشط",
    upgradeNow: "رقي حسابك",
    userName: "قارئ المانجا",
    // Auth
    loginTitle: "مرحبًا بعودتك",
    loginDesc: "سجل الدخول لحفظ تقدمك وإدارة اشتراكك.",
    signInGoogle: "تسجيل الدخول باستخدام Google",
    signInDiscord: "تسجيل الدخول باستخدام Discord",
    guestUser: "زائر",
    guestEmail: "guest@example.com",
    logOut: "تسجيل الخروج",
    loggingOut: "جاري تسجيل الخروج..."
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<AppLanguage>('en');

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.body.dir = dir;
    if (language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [dir, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};