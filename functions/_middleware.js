import admin from 'firebase-admin';
import { sha256 } from '../js/sha256.js';

// --- Firebase Admin Initialization ---
// Ensure Firebase Admin is initialized only once
let firebaseAdminInitialized = false;
function initializeFirebaseAdmin(env) {
  if (!firebaseAdminInitialized) {
    try {
      const serviceAccountEnv = env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountEnv) {
        console.error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.");
        return false; // Indicate initialization failure
      }
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseAdminInitialized = true;
      console.log("Firebase Admin SDK initialized successfully.");
      return true; // Indicate success
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error);
      firebaseAdminInitialized = false; // Ensure it stays false on error
      return false; // Indicate failure
    }
  }
  return true; // Already initialized
}

// --- Authentication Middleware Logic ---
async function authenticateRequest(request, env) {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header', status: 401 };
  }

  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    return { authenticated: false, error: 'Missing token', status: 401 };
  }

  // Ensure Firebase Admin is initialized before verifying token
  if (!initializeFirebaseAdmin(env)) {
     return { authenticated: false, error: 'Firebase Admin SDK not initialized', status: 500 };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Token is valid, you can optionally use decodedToken.uid or other claims
    console.log("Token verified for UID:", decodedToken.uid);
    return { authenticated: true, user: decodedToken };
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    let status = 403; // Forbidden by default
    if (error.code === 'auth/id-token-expired') {
        status = 401; // Unauthorized if expired
    }
    return { authenticated: false, error: `Token verification failed: ${error.message}`, status: status };
  }
}


// Cloudflare Pages Middleware
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // --- Apply Authentication Check ONLY to proxy paths ---
  // Adjust the path check if your proxy function is located differently
  if (url.pathname.startsWith('/functions/proxy/') || url.pathname.startsWith('/api/proxy/')) { // Check both common paths
    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      // Return error response if authentication fails
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Optional: Attach user info to context for downstream functions
    // context.data = context.data || {};
    // context.data.user = authResult.user;
  }

  // Proceed to the next middleware or the target function (e.g., proxy)
  const response = await next();

  // --- Inject Environment Variables into HTML responses (existing logic) ---
  // Check if the response is HTML
  const contentType = response.headers.get("content-type") || "";
  
  if (contentType.includes("text/html")) {
    // Get the original HTML content
    let html = await response.text();
    
    // Replace the placeholder with actual environment variable value
    // If PASSWORD is not set, replace with empty string
    const password = env.PASSWORD || "";
    let passwordHash = "";
    if (password) {
      passwordHash = await sha256(password);
    }
    // Use a more robust regex to avoid issues if the line format changes slightly
    html = html.replace(/window\.__ENV__\.PASSWORD\s*=\s*"{{PASSWORD}}";/,
                        `window.__ENV__.PASSWORD = "${passwordHash}"; // SHA-256 hash`);

    // Create a new response with the modified HTML
    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }
  
  // Return the original response for non-HTML content
  return response;
}