
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, logEvent, Analytics } from "firebase/analytics";

/**
 * Configuration Firebase.
 * Note : Les données Analytics peuvent mettre jusqu'à 24h pour apparaître dans le tableau de bord principal.
 * Utilisez la vue "Realtime" dans la console Firebase pour tester les visites immédiates.
 */
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "REMPLACER_PAR_VOTRE_CLE", 
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "app-ecotri.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "app-ecotri",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "app-ecotri.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;

/**
 * Vérifie si la configuration Firebase est valide.
 */
const isConfigValid = (config: typeof firebaseConfig) => {
  return (
    config.apiKey && 
    config.apiKey.startsWith("AIzaSy") && 
    !config.apiKey.includes("REMPLACER") &&
    config.appId && 
    !config.appId.includes("abcdef")
  );
};

if (typeof window !== 'undefined') {
  if (isConfigValid(firebaseConfig)) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      analytics = getAnalytics(app);
      console.log("✅ EcoTri Analytics : Initialisé (Données en cours d'envoi).");
    } catch (e) {
      console.warn("❌ EcoTri Analytics : Échec d'initialisation.", e);
    }
  } else {
    console.info(
      "ℹ️ EcoTri Analytics : Désactivé. Pour l'activer, remplissez 'services/firebaseConfig.ts' " +
      "ou configurez les secrets FIREBASE_API_KEY et FIREBASE_APP_ID dans votre environnement de déploiement."
    );
  }
}

export { analytics };

export const trackEvent = (eventName: string, params?: object) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.debug(`[Analytics-Debug] ${eventName}`, params);
    }
  } catch (e) {
    // Échec silencieux
  }
};
