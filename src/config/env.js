import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'AIzaSyBxmRRdxMomZP2eo7AS-UXCXD7-adk40Hk',
  authDomain: '',
  projectId: 'nsrit-school-2b749',
  storageBucket: 'nsrit-school-2b749.firebasestorage.app',
  messagingSenderId: '',
  appId: '1:234250139606:android:4781352049a208426b9677',
};

export const apiConfig = {
  baseURL: '',
  timeout: 15000,
};

// Use the local emulator in development mode
export const USE_EMULATOR = false;
// Use Firebase Auth emulator only (keeps DataConnect on production)
// Set true ONLY when running `firebase emulators:start --only auth` locally.
export const USE_AUTH_EMULATOR = false;

const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const dataConnectConfig = {
  projectId: firebaseConfig.projectId || 'nsrit-school-2b749',
  location: 'asia-south1',
  serviceId: 'nsrit-school-2b749-service',
  connectorId: 'nsrit',
  apiBaseURL: USE_EMULATOR
    ? `http://${EMULATOR_HOST}:9399/v1`
    : 'https://firebasedataconnect.googleapis.com/v1',
};

export const authConfig = {
  ENABLE_DEV_OTP_BYPASS: false,
};
