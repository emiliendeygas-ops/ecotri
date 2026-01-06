
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, logEvent, Analytics } from "firebase/analytics";

/**
 * Configuration Firebase
 * REMPLACER PAR VOS VRAIES VALEURS DE LA CONSOLE FIREBASE
 */
const firebaseConfig = {
  apiKey: "REMPLACER_PAR_VOTRE_CLE", 
  authDomain: "app-ecotri.firebaseapp.com",
  projectId: "app-ecotri",
  storageBucket: "app-ecotri.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};

let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;

/**
 * Vérifie si la configuration Firebase est valide et n'est pas une valeur par défaut.
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

try {
  if (typeof window !== 'undefined' && isConfigValid(firebaseConfig)) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    analytics = getAnalytics(app);
  }
} catch (e) {
  // On ne loggue l'erreur qu'en développement local pour ne pas polluer la console de l'utilisateur
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.debug("Firebase Analytics désactivé (Clé manquante ou invalide).");
  }
}

export { analytics };

/**
 * Envoie un événement à Firebase Analytics de manière sécurisée.
 * Cette fonction ne fera rien si Analytics n'est pas initialisé correctement.
 */
export const trackEvent = (eventName: string, params?: object) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    } else {
      // Mock en développement local pour vérifier que les événements seraient envoyés
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`[Firebase-Mock] Event: ${eventName}`, params);
      }
    }
  } catch (e) {
    // Échec silencieux pour éviter de bloquer l'application suite à un échec de tracking
  }
};
