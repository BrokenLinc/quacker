import { initializeApp, getApps, getApp } from 'firebase/app';

import firebaseConfig from './config';

// Initialize Firebase once (prevent multiple initialization during live-reload)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
