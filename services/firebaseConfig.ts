
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, logEvent, Analytics, isSupported } from "firebase/analytics";

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    return process.env[key] || (import.meta.env && import.meta.env[key]) || "";
  } catch (e) {
    return "";
  }
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
    console.debug("📊 [Firebase] Missing configuration. Analytics disabled.");
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
      console.log("📊 [Firebase] Initialized successfully.");
      
      while (eventQueue.length > 0) {
        const event = eventQueue.shift();
        if (event) logEvent(analyticsInstance, event.name, event.params);
      }
    }
  } catch (e) {
    console.warn("📊 [Firebase] Initialization failed:", e);
  }
};

initAnalytics();

export const trackEvent = (eventName: string, params?: object) => {
  if (typeof window === 'undefined') return;
  console.log(`📡 [Track] ${eventName}`, params || "");

  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, params);
    } catch (e) {}
  } else {
    eventQueue.push({ name: eventName, params });
    initAnalytics();
  }
};
