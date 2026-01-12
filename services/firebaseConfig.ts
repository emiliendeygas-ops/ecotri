
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

let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;

// Initialisation immédiate si possible
if (typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app);
        console.log("📊 Analytics Firebase : Initialisé");
      }
    });
  } catch (e) {
    console.warn("Analytics Init Error:", e);
  }
}

export { analytics };

/**
 * Envoie un événement à Firebase Analytics.
 */
export const trackEvent = (eventName: string, params?: object) => {
  if (typeof window === 'undefined') return;

  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
    
    // Log console pour débogage
    if (location.hostname === 'localhost' || location.hostname.includes('web.app')) {
      console.log(`[Event] ${eventName}`, params);
    }
  } catch (e) {
    console.error("Tracking Error:", e);
  }
};
