// backend/firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

// Initialize Firebase Admin SDK using Service Account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_CAMPUS_LOST_FOUND_C6D88);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "campus-lost-found-c6d88.appspot.com"
});

// Export Firestore and Storage
const db = admin.firestore();
const bucket = admin.storage().bucket();

export { admin, db, bucket };
