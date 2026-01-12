
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, logEvent, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, 
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

let analyticsInstance: Analytics | null = null;
const eventQueue: { name: string; params?: object }[] = [];

/**
 * Vérifie si la configuration Firebase est complète
 */
const isConfigValid = () => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.appId
  );
};

// Initialisation asynchrone sécurisée
const initAnalytics = async () => {
  if (typeof window === 'undefined') return;
  
  if (!isConfigValid()) {
    console.warn("📊 [Firebase] Configuration incomplète. Vérifiez vos variables d'environnement (PROJECT_ID, API_KEY, APP_ID).");
    return;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const supported = await isSupported();
    
    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log("📊 [Firebase] Analytics initialisé pour le projet:", firebaseConfig.projectId);
      
      // Vider la file d'attente
      while (eventQueue.length > 0) {
        const event = eventQueue.shift();
        if (event) logEvent(analyticsInstance, event.name, event.params);
      }
    }
  } catch (e) {
    console.error("📊 [Firebase] Erreur d'initialisation critique:", e);
  }
};

initAnalytics();

export const trackEvent = (eventName: string, params?: object) => {
  if (typeof window === 'undefined') return;

  // Log de diagnostic toujours présent en console
  console.log(`📡 [Analytics Event] ${eventName}`, params || "");

  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, params);
    } catch (e) {
      console.error(`❌ [Analytics Error] ${eventName}:`, e);
    }
  } else {
    // Mise en file d'attente si non prêt
    eventQueue.push({ name: eventName, params });
  }
};
