// ══════════════════════════════════════════════════════════
// 🔥 firebase.js — إعداد Firebase
// ══════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ✅ إعدادات مشروعك الفعلية من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAdcoR2gY3ViocZjU2WqMLXbwIFFSd7Mtg",
  authDomain: "academy-system-a00e3.firebaseapp.com",
  projectId: "academy-system-a00e3",
  storageBucket: "academy-system-a00e3.firebasestorage.app",
  messagingSenderId: "459207951706",
  appId: "1:459207951706:web:d42b15185ea41c89bf5f63",
  measurementId: "G-4WEGTNDPH2" // اختياري، يمكن الاحتفاظ به
};

// ── Initialize ────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app); // يمكنك تصديره إذا أردت استخدام التحليلات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const gProv = new GoogleAuthProvider();

// ══════════════════════════════════════════════════════════
// إنشاء / قراءة مستند المستخدم في Firestore
// ══════════════════════════════════════════════════════════
export async function ensureUserDoc(fbUser, defaultRole = "student") {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const data = {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email.split("@")[0],
    email: fbUser.email,
    role: defaultRole,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data;
}

// ══════════════════════════════════════════════════════════
// ترجمة أخطاء Firebase إلى عربي
// ══════════════════════════════════════════════════════════
export function fbErr(code) {
  const map = {
    "auth/user-not-found":          "البريد الإلكتروني غير مسجل",
    "auth/wrong-password":          "كلمة المرور غير صحيحة",
    "auth/invalid-credential":      "البريد أو كلمة المرور غير صحيحة",
    "auth/too-many-requests":       "تم تجاوز عدد المحاولات، حاول لاحقاً",
    "auth/network-request-failed":  "خطأ في الاتصال بالإنترنت",
    "auth/invalid-email":           "صيغة البريد الإلكتروني غير صحيحة",
    "auth/popup-closed-by-user":    "",
    "auth/email-already-in-use":    "البريد مسجل مسبقاً",
  };
  return map[code] || `خطأ: ${code}`;
}