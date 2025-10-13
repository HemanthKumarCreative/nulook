# In-Extension Google Authentication (No Popups/Redirects)

This approach keeps users within the extension UI while handling Google authentication seamlessly using the Google Sign-In JavaScript Library.

## Google Sign-In JavaScript Library Method

### Benefits:
✅ **No extension ID dependency** - works for everyone  
✅ **No publishing required** - works with unpacked extensions  
✅ **Easy to share** - just share the extension files  
✅ **In-extension experience** - no popups or redirects  
✅ **No backend required** - can work with just frontend  
✅ **Immediate use** - no waiting for approval  
✅ **No redirect URI configuration needed** - works out of the box  

## Step-by-Step Implementation

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Navigate to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API" and enable it

3. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** > **OAuth consent screen**
   - Choose **"External"** user type
   - Fill in app information:
     - **App name**: `NUSENSE TryON`
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **"SAVE AND CONTINUE"**

4. **Add Scopes**
   - Click **"ADD OR REMOVE SCOPES"**
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click **"UPDATE"** then **"SAVE AND CONTINUE"**

5. **Add Test Users**
   - Click **"ADD USERS"**
   - Add your email address
   - Click **"SAVE AND CONTINUE"**

6. **Create OAuth2 Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **"+ CREATE CREDENTIALS"** > **"OAuth 2.0 Client IDs"**
   - Choose **"Web application"**
   - **Name**: `NUSENSE TryON Web Auth`
   - **Authorized JavaScript origins**: 
     - `https://localhost:8000` (required by Google, not where extension runs)
     - `https://yourdomain.com` (replace with your actual domain if you have one)
   - **Authorized redirect URIs**:
     - `https://localhost:8000/callback` (required by Google, not used by extension)
     - `https://yourdomain.com/callback` (replace with your actual domain if you have one)
   - Click **"CREATE"**
   - **Copy the Client ID** - you'll need this for your extension

**Important Note**: The `localhost:8000` URLs are required by Google's OAuth system but your extension doesn't actually run on localhost. The extension runs directly in the browser as a Chrome extension. These URLs are just placeholders that Google requires for OAuth configuration.

### Step 2: Update Extension Files

#### 2.1: Update manifest.json
```json
{
  "manifest_version": 3,
  "name": "NUSENSE TryON",
  "version": "2.0",
  "description": "Transformez votre style avec l'essayage virtuel alimenté par IA. Sélectionnez des vêtements de n'importe quel site web et voyez comment ils vous vont instantanément.",
  "permissions": [
    "activeTab",
    "scripting", 
    "storage"
  ],
  "host_permissions": [
    "https://try-on-server-v1.onrender.com/*",
    "https://accounts.google.com/*",
    "https://www.googleapis.com/*",
    "https://*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/16.png",
      "20": "icons/20.png",
      "29": "icons/29.png",
      "32": "icons/32.png",
      "40": "icons/40.png",
      "48": "icons/48.png",
      "50": "icons/50.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/16.png",
    "20": "icons/20.png",
    "29": "icons/29.png",
    "32": "icons/32.png",
    "40": "icons/40.png",
    "48": "icons/48.png",
    "50": "icons/50.png"
  }
}
```

#### 2.2: Update popup.html
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NUSENSE TryON</title>
    <link rel="stylesheet" href="popup.css" />
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body>
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <div class="logo-text">
          <h1>
            <img src="NUSENSE_LOGO.svg" alt="NUSENSE" class="logo-text-image" />
          </h1>
          <p class="tagline">Essayage Virtuel Alimenté par IA</p>
        </div>
      </div>
      <div class="header-actions">
        <!-- User Authentication Section -->
        <div id="user-auth-section" class="user-auth-section">
          <!-- User Profile (shown when authenticated) -->
          <div id="user-profile" class="user-profile hidden">
            <div class="user-info">
              <div class="user-avatar-container">
                <img
                  id="user-avatar"
                  src=""
                  alt="Avatar utilisateur"
                  class="user-avatar"
                />
                <div
                  id="user-avatar-fallback"
                  class="user-avatar-fallback hidden"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div class="user-details">
                <span id="user-name" class="user-name"></span>
                <span id="user-email" class="user-email"></span>
              </div>
            </div>
            <button id="signout-btn" class="signout-btn" title="Se déconnecter">
              <svg
                class="signout-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 17L21 12L16 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 12H9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <button id="cart-btn" class="cart-btn" title="Voir le panier">
          <span class="cart-icon">🛍️</span>
          <span id="cart-count" class="cart-count hidden">0</span>
        </button>
      </div>
    </header>

    <!-- Authentication Gate -->
    <div id="auth-gate" class="auth-gate">
      <div class="auth-gate-content">
        <div class="auth-gate-icon">🔐</div>
        <h2 class="auth-gate-title">Connexion Requise</h2>
        <p class="auth-gate-description">
          Connectez-vous avec Google pour accéder à l'essayage virtuel alimenté
          par IA
        </p>
        <!-- Google Sign-In Button -->
        <div id="g_id_onload"
             data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="sign_in_with"
             data-shape="rectangular"
             data-logo_alignment="left">
        </div>
        <p class="auth-gate-privacy">
          En vous connectant, vous acceptez nos conditions d'utilisation et
          notre politique de confidentialité
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <main id="main-content" class="main-content hidden">
      <!-- Your existing app content goes here -->
    </main>

    <!-- Status Messages -->
    <div id="status" class="status" style="display: none;"></div>

    <script src="popup.js"></script>
  </body>
</html>
```

**Important**: Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID from Google Console.

#### 2.3: Update popup.js
```javascript
// Global variables
let currentUser = null;
const STORAGE_KEYS = {
  USER_AUTH: 'nusense_user_auth'
};

// DOM elements
const authGate = document.getElementById('auth-gate');
const mainContent = document.getElementById('main-content');
const statusDiv = document.getElementById('status');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const userAvatar = document.getElementById('user-avatar');
const signOutBtn = document.getElementById('signout-btn');

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  await initializeExtension();
});

// Initialize extension
async function initializeExtension() {
  try {
    // Check if user is already authenticated
    const storedUser = await getFromStorage(STORAGE_KEYS.USER_AUTH);
    
    if (storedUser && storedUser.accessToken) {
      // Verify token is still valid
      const isValid = await verifyToken(storedUser.accessToken);
      
      if (isValid) {
        currentUser = storedUser;
        updateUserInterface(true);
        return;
      } else {
        // Token expired, clear storage
        await clearStorageKey(STORAGE_KEYS.USER_AUTH);
      }
    }
    
    // Show authentication gate
    updateUserInterface(false);
    
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    updateUserInterface(false);
  }
}

// Handle Google Sign-In response
function handleCredentialResponse(response) {
  try {
    setStatus("🔐 Connexion réussie !");
    
    // Decode the JWT token to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    // Store user data
    currentUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      accessToken: response.credential,
      loginTime: Date.now()
    };
    
    // Save to storage
    saveToStorage(STORAGE_KEYS.USER_AUTH, currentUser);
    
    // Update UI
    updateUserInterface(true);
    
    setStatus("✅ Connexion réussie ! Bienvenue, " + currentUser.name);
    
    // Clear status after 3 seconds
    setTimeout(() => {
      if (statusDiv.textContent.includes("Connexion réussie")) {
        setStatus("");
      }
    }, 3000);

  } catch (error) {
    console.error("Sign-in error:", error);
    setStatus("❌ Échec de la connexion. Veuillez réessayer.");
  }
}

// Verify token (optional - for token validation)
async function verifyToken(token) {
  try {
    // For JWT tokens from Google Sign-In JavaScript Library, we can decode and check expiration
    if (!token || typeof token !== "string") {
      console.error("Invalid access token for verification");
      return false;
    }

    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      console.log("Token is expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

// Update user interface based on authentication state
function updateUserInterface(isAuthenticated) {
  if (isAuthenticated && currentUser) {
    // Show main content
    authGate.style.display = 'none';
    mainContent.style.display = 'block';
    
    // Update user info
    userName.textContent = currentUser.name;
    userEmail.textContent = currentUser.email;
    userAvatar.src = currentUser.picture;
    userAvatar.alt = currentUser.name;
    
    // Add sign-out event listener
    signOutBtn.addEventListener('click', handleSignOut);
    
  } else {
    // Show authentication gate
    authGate.style.display = 'block';
    mainContent.style.display = 'none';
  }
}

// Handle sign out
async function handleSignOut() {
  try {
    setStatus("👋 Déconnexion en cours...");
    
    // Clear user data
    currentUser = null;
    await clearStorageKey(STORAGE_KEYS.USER_AUTH);
    
    // Update UI
    updateUserInterface(false);
    
    setStatus("👋 Déconnexion réussie !");
    
    // Clear status after 2 seconds
    setTimeout(() => {
      if (statusDiv.textContent.includes("Déconnexion réussie")) {
        setStatus("");
      }
    }, 2000);
    
  } catch (error) {
    console.error("Sign-out error:", error);
    setStatus("❌ Erreur lors de la déconnexion.");
  }
}

// Utility functions
function setStatus(message) {
  statusDiv.textContent = message;
  statusDiv.style.display = message ? 'block' : 'none';
}

async function saveToStorage(key, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: data }, resolve);
  });
}

async function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

async function clearStorageKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}
```

### Step 3: Test Your Extension

1. **Load the extension in Chrome**
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **"Load unpacked"** and select your extension folder

2. **Test the authentication**
   - Click the extension icon in the toolbar
   - You should see the authentication gate
   - Click the Google Sign-In button
   - Complete the Google authentication
   - You should see the main content with your user info

3. **Test sign-out**
   - Click the "Se déconnecter" button
   - You should see the authentication gate again

### Step 4: Share Your Extension

1. **Share the extension folder** with others
2. **They load it as unpacked** extension in Chrome
3. **Works immediately** - no publishing required
4. **No extension ID conflicts** - works for everyone

## Troubleshooting

### "This app isn't verified" warning
- This is normal for development/testing
- Click **"Advanced"** and then **"Go to NUSENSE TryON (unsafe)"**
- This warning will always appear for unverified apps (which is fine for testing)

### Google Sign-In button not appearing
- Check that the Google Sign-In library is loaded
- Verify your Client ID is correct in popup.html
- Check browser console for any JavaScript errors

### Authentication not working
- Verify your Client ID in Google Console matches the one in popup.html
- Check that you've added the correct authorized origins in Google Console
- Make sure you're added as a test user in Google Console

### Extension not loading
- Check manifest.json for syntax errors
- Verify all file paths are correct
- Check browser console for any errors

## Benefits of This Approach

✅ **No extension ID dependency** - works for everyone  
✅ **No publishing required** - works with unpacked extensions  
✅ **Easy to share** - just share the extension files  
✅ **In-extension experience** - no popups or redirects  
✅ **No backend required** - can work with just frontend  
✅ **Immediate use** - no waiting for approval  
✅ **Secure** - uses Google's official authentication  
✅ **Reliable** - works consistently across different users  
✅ **No redirect URI configuration needed** - works out of the box  

## What You DON'T Need

- ❌ Chrome Web Store publishing
- ❌ Extension ID management
- ❌ OAuth redirect URI configuration per user
- ❌ Backend server
- ❌ Domain hosting (for the extension itself)
- ❌ Complex setup procedures
- ❌ Chrome Extension OAuth2 configuration
- ❌ Running a localhost server for the extension

## Important Clarifications

### **Your Extension Does NOT Run on localhost:8000**
- ✅ **Extension runs directly in the browser** as a Chrome extension
- ✅ **No server needed** - it's a client-side extension
- ✅ **localhost:8000 is just a placeholder** required by Google's OAuth system
- ✅ **The extension works immediately** after loading it in Chrome

### **OAuth Configuration is Just for Google's System**
- ✅ **Google requires these URLs** even though we don't use redirects
- ✅ **You can use any valid URLs** (localhost:8000, yourdomain.com, etc.)
- ✅ **The extension doesn't actually connect to these URLs**
- ✅ **It's just a formality for Google's OAuth validation**

## Key Differences from Chrome Extension OAuth2

| Feature | Chrome Extension OAuth2 | Google Sign-In JS Library |
|---------|------------------------|---------------------------|
| **Setup Complexity** | Requires extension ID configuration | Simple, no extension ID needed |
| **Redirect URIs** | Must configure per extension ID | Not required |
| **Sharing** | Each user needs different config | Works for everyone immediately |
| **Publishing** | Must be published to Chrome Web Store | Works with unpacked extensions |
| **Token Type** | Access tokens | JWT tokens |
| **Token Validation** | API calls to Google | Local JWT decoding |
| **User Experience** | Popup/redirect flow | In-extension seamless flow |

This method gives you a complete, working Google authentication system that can be shared with anyone without any additional setup!