import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
} from "firebase/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

// Suppress Firestore offline warnings in console
setLogLevel("silent");

export const firebaseConfig = firebaseConfigData;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with persistent cache
let firestoreDb;

try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (e) {
  try {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (e2) {
    console.warn("Failed to initialize named database, falling back to default", e2);
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;