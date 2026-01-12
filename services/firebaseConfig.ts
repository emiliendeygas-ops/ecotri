
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, logEvent, Analytics, isSupported } from "firebase/analytics";

// Fonction sécurisée pour récupérer les variables d'environnement
const getEnv = (key: string): string => {
  try {
    // Tentative via import.meta.env (Vite standard)
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
    
    // Tentative via process.env (Node/Webpack fallback)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // Silencieux
  }
  return "";
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID")
};

let analyticsInstance: Analytics | null = null;
const eventQueue: { name: string; params?: object }[] = [];

const checkConfig = () => {
  const hasMinConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
  
  if (!hasMinConfig) {
    console.debug("📊 [Firebase] Configuration absente ou incomplète. Analytics en attente.");
    return false;
  }
  return true;
};

const initAnalytics = async () => {
  if (typeof window === 'undefined') return;
  
  if (!checkConfig()) return;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const supported = await isSupported();
    
    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log("📊 [Firebase] Initialisé avec succès.");
      
      while (eventQueue.length > 0) {
        const event = eventQueue.shift();
        if (event) logEvent(analyticsInstance, event.name, event.params);
      }
    }
  } catch (e) {
    console.warn("📊 [Firebase] Erreur d'initialisation (peut-être un bloqueur de pub):", e);
  }
};

initAnalytics();

export const trackEvent = (eventName: string, params?: object) => {
  if (typeof window === 'undefined') return;
  
  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, params);
    } catch (e) {}
  } else {
    // Si pas encore initialisé, on garde en file d'attente
    eventQueue.push({ name: eventName, params });
    // On ré-essaye l'initialisation au cas où les clés seraient arrivées
    initAnalytics();
  }
};
