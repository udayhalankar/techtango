// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Updated translations for headline_line1 & headline_line2 across all languages
const resources = {
  en: { common: {
    headline_line1: "Manage your Business Effortlessly.",
    headline_line2:
      "Your core competence is what keeps you ahead of your competition. So while you focus on your core competence, experience the effortless ease of doing business by using Tymebound",
    applications: "Applications",
    search: "Search",
    login: "Log in",
    add_new_subscription: "Add New\nSubscription",
    welcome_name: "Welcome, {{name}}!",
  }},
  ar: { common: {
    headline_line1: "أدِر عملك بسهولة وبدون عناء.",
    headline_line2:
      "كفاءتك الجوهرية هي ما يبقيك متقدمًا على المنافسين. وبينما تركز على جوهر تميّزك، اختبر سهولة إدارة الأعمال باستخدام Tymebound",
    applications: "التطبيقات",
    search: "بحث",
    login: "تسجيل الدخول",
    add_new_subscription: "إضافة اشتراك جديد",
    welcome_name: "مرحبًا، {{name}}!",
  }},
  hi: { common: {
    headline_line1: "अपने व्यवसाय को बिना मेहनत के प्रबंधित करें।",
    headline_line2:
      "आपकी मुख्य दक्षता ही आपको प्रतिस्पर्धा से आगे रखती है। इसलिए जब आप अपनी मूल दक्षता पर ध्यान दें, तो Tymebound के साथ कारोबार करना कितना सहज है—इसे महसूस करें।",
    applications: "एप्लिकेशन",
    search: "खोज",
    login: "लॉगिन",
    add_new_subscription: "नया सदस्यता जोड़ें",
    welcome_name: "स्वागत है, {{name}}!",
  }},
  ta: { common: {
    headline_line1: "உங்கள் வணிகத்தை எளிதாக நிர்வகிக்கவும்.",
    headline_line2:
      "உங்கள் முக்கிய திறனே உங்களை போட்டியாளர்களை விட முன்னிலையில் வைத்திருக்கிறது. ஆகவே நீங்கள் உங்கள் மூல திறனில் கவனம் செலுத்தும் போது, Tymebound மூலம் வணிகத்தை நடத்துவதின் எளிமையை அனுபவிக்கவும்.",
    applications: "பயன்பாடுகள்",
    search: "தேடல்",
    login: "உள்நுழை",
    add_new_subscription: "புதிய சந்தாவைச் சேர்க்கவும்",
    welcome_name: "வரவேற்கிறோம், {{name}}!",
  }},
  fr: { common: {
    headline_line1: "Gérez votre entreprise sans effort.",
    headline_line2:
      "Votre compétence clé vous maintient devant la concurrence. Pendant que vous vous concentrez sur votre cœur de métier, découvrez la simplicité de faire des affaires avec Tymebound.",
    applications: "Applications",
    search: "Recherche",
    login: "Connexion",
    add_new_subscription: "Ajouter un nouvel abonnement",
    welcome_name: "Bienvenue, {{name}}!",
  }},
  es: { common: {
    headline_line1: "Gestiona tu negocio sin esfuerzo.",
    headline_line2:
      "Tu competencia clave te mantiene por delante de la competencia. Mientras te concentras en tu actividad principal, experimenta la facilidad de hacer negocios con Tymebound.",
    applications: "Aplicaciones",
    search: "Buscar",
    login: "Iniciar sesión",
    add_new_subscription: "Añadir nueva suscripción",
    welcome_name: "¡Bienvenido/a, {{name}}!",
  }},
  mr: { common: {
    headline_line1: "आपला व्यवसाय सहजपणे व्यवस्थापित करा.",
    headline_line2:
      "आपली मूळ कौशल्येच तुम्हाला स्पर्धेपेक्षा पुढे ठेवतात. त्यामुळे तुम्ही आपल्या मूलभूत कौशल्यांवर लक्ष केंद्रित करत असताना, Tymebound चा वापर करून व्यवसाय करणे किती सोपे आहे ते अनुभवा.",
    applications: "अनुप्रयोग",
    search: "शोधा",
    login: "लॉगिन",
    add_new_subscription: "नवीन सदस्यता जोडा",
    welcome_name: "स्वागत आहे, {{name}}!",
  }},
  bn: { common: {
    headline_line1: "আপনার ব্যবসা অনায়াসে পরিচালনা করুন।",
    headline_line2:
      "আপনার মূল দক্ষতাই আপনাকে প্রতিযোগিতায় এগিয়ে রাখে। তাই যখন আপনি আপনার মূল দক্ষতার উপর মনোযোগ দেন, Tymebound ব্যবহার করে ব্যবসা করার অনায়াস সুবিধা অনুভব করুন।",
    applications: "অ্যাপ্লিকেশনসমূহ",
    search: "অনুসন্ধান",
    login: "লগইন",
    add_new_subscription: "নতুন সাবস্ক্রিপশন যোগ করুন",
    welcome_name: "স্বাগতম, {{name}}!",
  }},
  gu: { common: {
    headline_line1: "તમારો વ્યવસાય સહેલાઈથી સંચાલિત કરો.",
    headline_line2:
      "તમારી મુખ્ય કુશળતા જ તમને સ્પર્ધકોથી આગળ રાખે છે. તેથી તમે તમારી કોર કંપિટન્સ પર ધ્યાન કેન્દ્રિત કરતા હો ત્યારે Tymebound સાથે બિઝનેસ કરવાની સહજ સરળતા અનુભવો.",
    applications: "ઍપ્લિકેશનો",
    search: "શોધ",
    login: "લૉગિન",
    add_new_subscription: "નવી સબ્સ્ક્રિપ્શન ઉમેરો",
    welcome_name: "સ્વાગત છે, {{name}}!",
  }},
  kn: { common: {
    headline_line1: "ನಿಮ್ಮ ವ್ಯವಹಾರವನ್ನು ಸುಲಭವಾಗಿ ನಿರ್ವಹಿಸಿ.",
    headline_line2:
      "ನಿಮ್ಮ ಮೂಲ ದಕ್ಷತೆಯೇ ನಿಮ್ಮನ್ನು ಸ್ಪರ್ಧೆಯಿಂದ ಮುಂದೆ ಇಡುತ್ತದೆ. ಆದ್ದರಿಂದ ನೀವು ನಿಮ್ಮ ಮೂಲ ಸಾಮರ್ಥ್ಯಕ್ಕೆ ಗಮನಕೊಡುತ್ತಿರುವಾಗ, Tymebound ಬಳಸಿ ವ್ಯವಹಾರ ಮಾಡುವ ಸುಗಮತೆಯನ್ನು ಅನುಭವಿಸಿ.",
    applications: "ಅನ್ವಯಗಳು",
    search: "ಹುಡುಕಿ",
    login: "ಲಾಗಿನ್",
    add_new_subscription: "ಹೊಸ ಚಂದಾದಾರಿಕೆಯನ್ನು ಸೇರಿಸಿ",
    welcome_name: "ಸ್ವಾಗತ, {{name}}!",
  }},
  te: { common: {
    headline_line1: "మీ వ్యాపారాన్ని సులభంగా నిర్వహించండి.",
    headline_line2:
      "మీ కోర్ నైపుణ్యమే మిమ్మల్ని పోటీదారుల కంటే ముందుంచుతుంది. కాబట్టి మీరు మీ మూల నైపుణ్యంపై దృష్టి పెట్టినప్పుడే, Tymebound తో వ్యాపారం చేయడం ఎంత సులభమో అనుభవించండి.",
    applications: "అనువర్తనాలు",
    search: "శోధించండి",
    login: "లాగిన్",
    add_new_subscription: "కొత్త చందా జోడించండి",
    welcome_name: "స్వాగతం, {{name}}!",
  }},
  ml: { common: {
    headline_line1: "നിങ്ങളുടെ ബിസിനസ് എളുപ്പത്തിൽ നിയന്ത്രിക്കുക.",
    headline_line2:
      "നിങ്ങളുടെ മുഖ്യ പ്രാവീണ്യമാണ് നിങ്ങളെ മത്സരത്തിൽ മുന്നിൽ നിലനിർത്തുന്നത്. അതിനാൽ നിങ്ങൾ നിങ്ങളുടെ കോർ കംപറ്റൻസിലേക്കു ശ്രദ്ധ കേന്ദ്രീകരിക്കുമ്പോൾ, Tymebound ഉപയോഗിച്ച് ബിസിനസ് നടത്താനുള്ള എളുപ്പം അനുഭവിക്കുക.",
    applications: "ആപ്ലിക്കേഷനുകൾ",
    search: "തിരയുക",
    login: "ലോഗിൻ",
    add_new_subscription: "പുതിയ സബ്സ്ക്രിപ്ഷൻ ചേർക്കുക",
    welcome_name: "സ്വാഗതം, {{name}}!",
  }},
};

i18n
  .use(LanguageDetector)     // reads localStorage/navigator/html tag
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en","ar","hi","ta","fr","es","mr","bn","gu","kn","te","ml"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },  // don't require Suspense
    debug: false,                   // set true temporarily to see language change logs
    detection: {
      order: ["localStorage","navigator","htmlTag"],
      caches: ["localStorage"]
    }
  });

export default i18n;
