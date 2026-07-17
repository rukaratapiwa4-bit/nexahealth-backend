/**
 * NexaHealth — config/firebase.js
 * Firebase Admin SDK setup for server-side writes to Realtime Database.
 * Used for: chat messages, live order status pushes, driver GPS relay.
 *
 * ── SETUP STEPS ──
 * 1. Go to console.firebase.google.com → create a project (free Spark plan)
 * 2. In the project, go to Realtime Database → Create Database → start in
 *    "locked mode" (we'll set rules below)
 * 3. Go to Project Settings (gear icon) → Service Accounts tab
 * 4. Click "Generate new private key" — downloads a JSON file
 * 5. Open that JSON file, copy these 3 values into your Render env vars:
 *      FIREBASE_PROJECT_ID     = project_id field
 *      FIREBASE_CLIENT_EMAIL   = client_email field
 *      FIREBASE_PRIVATE_KEY    = private_key field (keep the \n characters as-is)
 *      FIREBASE_DATABASE_URL   = shown at top of your Realtime Database page,
 *                                looks like https://your-project-default-rtdb.firebaseio.com
 *
 * NOTE: FIREBASE_PRIVATE_KEY will contain literal "\n" sequences. When pasting
 * into Render's environment variable UI, paste it exactly as copied from the
 * JSON file (with quotes and \n intact) — the code below handles the
 * conversion back to real newlines.
 */

const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    console.warn('⚠️ Firebase environment variables missing — chat/live features disabled until configured.');
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });

  initialized = true;
  console.log('✅ Firebase Admin initialized');
  return admin;
}

/**
 * Returns the Realtime Database instance, or null if Firebase isn't
 * configured yet (lets the rest of the app keep running without crashing).
 */
function getDatabase() {
  const app = initFirebase();
  return app ? app.database() : null;
}

module.exports = { initFirebase, getDatabase };
