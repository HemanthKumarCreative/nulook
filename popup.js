// popup.js

// --- Global State ---
let selectedClothingUrl = null;
let inFlightController = null;
let cartItems = [];
let currentProductInfo = null;
let currentUser = null;

// --- Storage Keys ---
const STORAGE_KEYS = {
  UPLOADED_IMAGE: "nusense_tryon_uploaded_image",
  GENERATED_IMAGE: "nusense_tryon_generated_image",
  SELECTED_CLOTHING_URL: "nusense_tryon_selected_clothing_url",
  LAST_SESSION_DATA: "nusense_tryon_last_session",
  CART_ITEMS: "nusense_tryon_cart_items",
  PRODUCT_INFO: "nusense_tryon_product_info",
  USER_AUTH: "nusense_tryon_user_auth",
};

// --- DOM Elements ---
const form = document.getElementById("tryon-form");
const personImageInput = document.getElementById("person-image");
const personPreviewContainer = document.getElementById(
  "person-preview-container"
);
const personPreviewImage = document.getElementById("person-preview-image");
const personFilePickerBtn = document.getElementById("person-file-picker-btn");
const galleryContainer = document.getElementById("website-images-container");
const previewContainer = document.getElementById("clothing-preview-container");
const previewImage = document.getElementById("clothing-preview-image");
const clothingSelectionBtn = document.getElementById("clothing-selection-btn");
const generateButton = document.getElementById("generate-btn");
const statusDiv = document.getElementById("status");
const resultContainer = document.getElementById("result-container");
const resultImage = document.getElementById("result-image");
const downloadButton = document.getElementById("download-btn");
const resultDownloadButton = document.getElementById("result-download-btn");
const buyNowButton = document.getElementById("buy-now-btn");
const addToCartButton = document.getElementById("add-to-cart-btn");
const tryInStoreButton = document.getElementById("try-in-store-btn");
const cartButton = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
const cartModal = document.getElementById("cart-modal");
const closeCartModal = document.getElementById("close-cart-modal");
const cartItemsContainer = document.getElementById("cart-items-container");
const cartTotalPrice = document.getElementById("cart-total-price");
const clearCartButton = document.getElementById("clear-cart-btn");
const checkoutButton = document.getElementById("checkout-btn");

// Error display elements
const successResult = document.getElementById("success-result");
const errorResult = document.getElementById("error-result");
const errorResultMessage = document.getElementById("error-result-message");

// Google Sign-In elements
const userProfile = document.getElementById("user-profile");
const userAvatar = document.getElementById("user-avatar");
const userAvatarFallback = document.getElementById("user-avatar-fallback");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const signoutBtn = document.getElementById("signout-btn");

// Authentication gate elements
const authGate = document.getElementById("auth-gate");
const mainContent = document.getElementById("main-content");
const authGateSigninBtn = document.getElementById("auth-gate-signin-btn");

// Backend URL (adjust if needed)
const API_URL =
  "https://try-on-server-v1-294135365335.europe-west9.run.app/api/fashion-photo";

// --- Utility ---

function setStatus(msg) {
  statusDiv.textContent = msg;
}

/**
 * Display error message with enhanced inline UI/UX
 * @param {Object} errorData - Error data from API response
 * @param {string} errorData.status - Error status
 * @param {Object} errorData.error_message - Error message object
 * @param {string} errorData.error_message.code - Error code
 * @param {string} errorData.error_message.message - Error message
 */
function showError(errorData) {
  // Keep status message visible with error context
  setStatus("❌ Erreur lors de la génération de votre essayage virtuel");

  // Set user-friendly error message (without technical keys)
  let errorMessage =
    errorData.error_message?.message || "Une erreur inattendue s'est produite.";

  // Provide more user-friendly messages for specific error codes
  const errorCode = errorData.error_message?.code;
  if (errorCode === "MODEL_TIMEOUT") {
    errorMessage =
      "La génération prend plus de temps que prévu. Veuillez réessayer avec des images plus simples ou une meilleure connexion internet.";
  } else if (errorCode === "MISSING_FILES_ERROR") {
    errorMessage =
      "Veuillez vous assurer que vous avez sélectionné à la fois votre photo et un article de vêtement.";
  } else if (errorCode === "SERVER_ERROR") {
    errorMessage =
      "Une erreur technique s'est produite. Veuillez réessayer dans quelques instants.";
  }

  errorResultMessage.textContent = errorMessage;

  // Show result container with error content
  resultContainer.classList.remove("hidden");
  successResult.classList.add("hidden");
  errorResult.classList.remove("hidden");

  // Add error animation to generate button
  generateButton.classList.add("button-error");
  setTimeout(() => {
    generateButton.classList.remove("button-error");
  }, 500);
}

/**
 * Hide error message and show success result
 */
function showSuccessResult() {
  resultContainer.classList.remove("hidden");
  errorResult.classList.add("hidden");
  successResult.classList.remove("hidden");
}

// --- Storage Utilities ---

/**
 * Save data to Chrome storage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 * @returns {Promise<void>}
 */
async function saveToStorage(key, data) {
  try {
    await chrome.storage.local.set({ [key]: data });
    console.log(`Saved to storage: ${key}`);
  } catch (error) {
    console.error(`Failed to save to storage ${key}:`, error);
  }
}

/**
 * Load data from Chrome storage
 * @param {string} key - Storage key
 * @returns {Promise<any>} - Stored data or null
 */
async function loadFromStorage(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  } catch (error) {
    console.error(`Failed to load from storage ${key}:`, error);
    return null;
  }
}

/**
 * Clear specific storage key
 * @param {string} key - Storage key to clear
 * @returns {Promise<void>}
 */
async function clearStorageKey(key) {
  try {
    await chrome.storage.local.remove([key]);
    console.log(`Cleared storage: ${key}`);
  } catch (error) {
    console.error(`Failed to clear storage ${key}:`, error);
  }
}

/**
 * Save uploaded person image to storage
 * @param {File} file - The uploaded file
 * @returns {Promise<void>}
 */
async function saveUploadedImage(file) {
  if (!file) return;

  try {
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const imageData = {
      dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: Date.now(),
    };

    await saveToStorage(STORAGE_KEYS.UPLOADED_IMAGE, imageData);
  } catch (error) {
    console.error("Failed to save uploaded image:", error);
  }
}

/**
 * Save generated result image to storage
 * @param {string} dataUrl - The generated image data URL
 * @returns {Promise<void>}
 */
async function saveGeneratedImage(dataUrl) {
  if (!dataUrl) return;

  try {
    const imageData = {
      dataUrl,
      timestamp: Date.now(),
    };

    await saveToStorage(STORAGE_KEYS.GENERATED_IMAGE, imageData);
  } catch (error) {
    console.error("Failed to save generated image:", error);
  }
}

/**
 * Restore uploaded image from storage
 * @returns {Promise<boolean>} - True if image was restored
 */
async function restoreUploadedImage() {
  try {
    const imageData = await loadFromStorage(STORAGE_KEYS.UPLOADED_IMAGE);
    if (!imageData || !imageData.dataUrl) return false;

    // Set the preview image
    personPreviewImage.src = imageData.dataUrl;
    personPreviewContainer.classList.remove("hidden");
    // Hide upload container when image is restored
    document.getElementById("person-upload-container").classList.add("hidden");

    // Create a mock file object for the input
    const response = await fetch(imageData.dataUrl);
    const blob = await response.blob();
    const file = new File([blob], imageData.fileName || "restored-image.jpg", {
      type: imageData.fileType || "image/jpeg",
    });

    // Create a new FileList-like object
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    personImageInput.files = dataTransfer.files;

    console.log("Restored uploaded image from storage");
    return true;
  } catch (error) {
    console.error("Failed to restore uploaded image:", error);
    return false;
  }
}

/**
 * Restore generated image from storage
 * @returns {Promise<boolean>} - True if image was restored
 */
async function restoreGeneratedImage() {
  try {
    const imageData = await loadFromStorage(STORAGE_KEYS.GENERATED_IMAGE);
    if (!imageData || !imageData.dataUrl) return false;

    // Set the result image
    resultImage.src = imageData.dataUrl;
    resultContainer.classList.remove("hidden");
    enableDownload(true);

    console.log("Restored generated image from storage");
    return true;
  } catch (error) {
    console.error("Failed to restore generated image:", error);
    return false;
  }
}

/**
 * Restore selected clothing URL from storage
 * @returns {Promise<boolean>} - True if URL was restored
 */
async function restoreSelectedClothingUrl() {
  try {
    const url = await loadFromStorage(STORAGE_KEYS.SELECTED_CLOTHING_URL);
    if (!url) return false;

    selectedClothingUrl = url;
    previewImage.src = url;

    // Update UI to show selected clothing
    galleryContainer.classList.add("hidden");
    previewContainer.classList.remove("hidden");

    console.log("Restored selected clothing URL from storage");
    return true;
  } catch (error) {
    console.error("Failed to restore selected clothing URL:", error);
    return false;
  }
}

/**
 * Save current session data
 * @returns {Promise<void>}
 */
async function saveSessionData() {
  try {
    const sessionData = {
      selectedClothingUrl,
      hasUploadedImage: personImageInput.files.length > 0,
      hasGeneratedImage: !!resultImage.src,
      timestamp: Date.now(),
    };

    await saveToStorage(STORAGE_KEYS.LAST_SESSION_DATA, sessionData);
  } catch (error) {
    console.error("Failed to save session data:", error);
  }
}

/**
 * Fetches an image with CORS handling and multiple fallback strategies
 * @param {string} url - The image URL to fetch
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<Blob>} - The image blob
 */
async function fetchImageWithCorsHandling(url, signal) {
  const strategies = [
    // Strategy 1: Direct fetch with no-cors mode
    async () => {
      const response = await fetch(url, {
        mode: "no-cors",
        signal,
      });
      if (response.type === "opaque") {
        // For no-cors responses, we can't read the body directly
        // We'll need to use a different approach
        throw new Error("No-cors response received");
      }
      return response.blob();
    },

    // Strategy 2: Try with cors mode
    async () => {
      const response = await fetch(url, {
        mode: "cors",
        signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.blob();
    },

    // Strategy 3: Use a CORS proxy service
    async () => {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      const response = await fetch(proxyUrl, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        signal,
      });
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }
      return response.blob();
    },

    // Strategy 4: Alternative CORS proxy
    async () => {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        url
      )}`;
      const response = await fetch(proxyUrl, {
        signal,
      });
      if (!response.ok) {
        throw new Error(`Alternative proxy error: ${response.status}`);
      }
      return response.blob();
    },
  ];

  let lastError;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying image fetch strategy ${i + 1} for: ${url}`);
      const blob = await strategies[i]();

      // Validate that we got a valid image blob
      if (blob && blob.size > 0) {
        console.log(`Successfully fetched image using strategy ${i + 1}`);
        return blob;
      }
    } catch (error) {
      console.warn(`Strategy ${i + 1} failed:`, error.message);
      lastError = error;

      // If this is an abort error, don't try other strategies
      if (error.name === "AbortError") {
        throw error;
      }
    }
  }

  throw new Error(
    `All fetch strategies failed. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
}

// Loading animation types
const LOADING_ANIMATIONS = {
  PULSING_DOTS: "pulsing-dots",
  WAVE: "wave-loading",
  SPINNER: "loading-spinner",
  PROGRESS: "loading-progress",
  PULSE: "loading-pulse",
  GLOW: "loading-glow",
  BREATHING: "breathing-loading",
  GRADIENT: "gradient-loading",
  MORPHING: "morphing-button",
};

// Current loading animation type
let currentLoadingType = LOADING_ANIMATIONS.PULSING_DOTS;

// Loading messages for different stages
const LOADING_MESSAGES = [
  "🎯 Préparation de votre expérience d'essayage virtuel...",
  "📥 Récupération de l'image de vêtement depuis le site web...",
  "💫 Laissez-nous faire la magie... Cela peut prendre un moment.",
  "🎨 Génération de votre essayage virtuel en cours...",
  "✨ Finalisation de votre image personnalisée...",
];

let loadingMessageIndex = 0;
let loadingMessageInterval = null;
let currentStep = 0;
let progressInterval = null;

function setBusy(isBusy) {
  generateButton.disabled = isBusy || generateButton.disabled;
  form.classList.toggle("busy", isBusy);

  // Update button loading state
  const btnLoading = generateButton.querySelector(".btn-loading");
  const btnText = generateButton.querySelector(".btn-text");
  const btnIcon = generateButton.querySelector(".btn-icon");

  if (isBusy) {
    // Remove all previous loading classes
    Object.values(LOADING_ANIMATIONS).forEach((animation) => {
      generateButton.classList.remove(animation);
    });

    // Add current loading animation
    generateButton.classList.add("button-loading");
    generateButton.classList.add(currentLoadingType);

    // Show loading content
    btnLoading.classList.remove("hidden");
    btnLoading.classList.add("show");

    // Update button content
    btnText.textContent = "Génération...";
    btnIcon.textContent = "⏱️";

    // Start cycling through loading messages
    startLoadingMessages();

    // Start progress tracking
    startProgressTracking();

    // Cycle through different loading animations
    cycleLoadingAnimations();
  } else {
    // Remove all loading classes
    generateButton.classList.remove("button-loading");
    Object.values(LOADING_ANIMATIONS).forEach((animation) => {
      generateButton.classList.remove(animation);
    });

    // Hide loading content
    btnLoading.classList.add("hidden");
    btnLoading.classList.remove("show");

    // Reset button content
    btnText.textContent = "Générer";
    btnIcon.textContent = "⚡";

    // Stop loading messages
    stopLoadingMessages();

    // Stop progress tracking
    stopProgressTracking();
  }
}

function startLoadingMessages() {
  loadingMessageIndex = 0;
  loadingMessageInterval = setInterval(() => {
    if (loadingMessageIndex < LOADING_MESSAGES.length) {
      setStatus(LOADING_MESSAGES[loadingMessageIndex]);
      loadingMessageIndex++;
    } else {
      // Reset to first message
      loadingMessageIndex = 0;
    }
  }, 3000); // Change message every 3 seconds
}

function stopLoadingMessages() {
  if (loadingMessageInterval) {
    clearInterval(loadingMessageInterval);
    loadingMessageInterval = null;
  }
}

function cycleLoadingAnimations() {
  const animations = [
    LOADING_ANIMATIONS.PULSING_DOTS,
    LOADING_ANIMATIONS.WAVE,
    LOADING_ANIMATIONS.PROGRESS,
    LOADING_ANIMATIONS.PULSE,
    LOADING_ANIMATIONS.GLOW,
    LOADING_ANIMATIONS.BREATHING,
    LOADING_ANIMATIONS.GRADIENT,
  ];

  let animationIndex = 0;

  const animationInterval = setInterval(() => {
    // Remove current animation
    generateButton.classList.remove(currentLoadingType);

    // Move to next animation
    animationIndex = (animationIndex + 1) % animations.length;
    currentLoadingType = animations[animationIndex];

    // Add new animation
    generateButton.classList.add(currentLoadingType);

    // Stop cycling if button is no longer busy
    if (!generateButton.disabled) {
      clearInterval(animationInterval);
    }
  }, 4000); // Change animation every 4 seconds
}

// Function to set specific loading animation
function setLoadingAnimation(animationType) {
  if (Object.values(LOADING_ANIMATIONS).includes(animationType)) {
    currentLoadingType = animationType;
  }
}

function startProgressTracking() {
  currentStep = 0;
  updateLoadingSteps();
  updateProgressBar(0);

  progressInterval = setInterval(() => {
    currentStep = (currentStep + 1) % 5;
    updateLoadingSteps();
    updateProgressBar((currentStep + 1) * 20);
  }, 2000); // Change step every 2 seconds
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  currentStep = 0;
  updateLoadingSteps();
  updateProgressBar(0);
}

function updateLoadingSteps() {
  const steps = generateButton.querySelectorAll(".loading-step");
  steps.forEach((step, index) => {
    if (index <= currentStep) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });
}

function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}

function enableDownload(enable) {
  downloadButton.disabled = !enable;
  if (resultDownloadButton) {
    resultDownloadButton.disabled = !enable;
    resultDownloadButton.style.display = enable ? "flex" : "none";
  }
}

// --- Google Sign-In Authentication ---

/**
 * Initialize Google Sign-In authentication
 */
async function initializeGoogleAuth() {
  try {
    // Check if user is already authenticated
    const savedUser = await loadFromStorage(STORAGE_KEYS.USER_AUTH);
    if (savedUser && savedUser.accessToken) {
      // Verify token is still valid
      const isValid = await verifyGoogleToken(savedUser.accessToken);
      if (isValid) {
        currentUser = savedUser;
        updateUserInterface(true);
        return;
      } else {
        // Token expired, clear saved user
        await clearStorageKey(STORAGE_KEYS.USER_AUTH);
      }
    }

    // Show sign-in interface
    updateUserInterface(false);
  } catch (error) {
    console.error("Failed to initialize Google auth:", error);
    updateUserInterface(false);
  }
}

/**
 * Handle Google Sign-In button click
 */
async function handleGoogleSignIn() {
  try {
    setStatus("🔐 Connexion avec Google...");

    // Disable sign-in button during authentication
    authGateSigninBtn.disabled = true;

    // Launch Google OAuth flow
    console.log("Calling chrome.identity.getAuthToken...");
    const token = await chrome.identity.getAuthToken({ interactive: true });

    console.log("Received token type:", typeof token);
    console.log("Received token value:", token);
    console.log("Token is string:", typeof token === "string");
    console.log("Token constructor:", token?.constructor?.name);
    console.log("Token JSON:", JSON.stringify(token));

    // Ensure we have a valid token string
    let validToken = null;
    if (typeof token === "string") {
      validToken = token;
    } else if (token && typeof token === "object") {
      // If token is an object, try to extract the string value
      console.log("Token is object, attempting to extract value");
      console.log("Token object keys:", Object.keys(token));
      console.log("Token object values:", Object.values(token));

      // Try different ways to extract the token
      if (token.token) {
        validToken = token.token;
      } else if (token.access_token) {
        validToken = token.access_token;
      } else if (token.accessToken) {
        validToken = token.accessToken;
      } else {
        // Last resort: try to stringify and parse
        try {
          const tokenStr = JSON.stringify(token);
          console.log("Token as JSON string:", tokenStr);
          // If it's a simple object with one property, extract it
          const parsed = JSON.parse(tokenStr);
          const firstKey = Object.keys(parsed)[0];
          validToken = parsed[firstKey];
        } catch (e) {
          console.error("Failed to extract token from object:", e);
          validToken = null;
        }
      }
    }

    console.log("Valid token:", validToken);
    console.log("Valid token type:", typeof validToken);

    if (validToken && typeof validToken === "string" && validToken.length > 0) {
      // Additional validation: ensure token looks like a real Google token
      if (
        validToken.startsWith("ya29.") ||
        validToken.startsWith("1//") ||
        validToken.length > 50
      ) {
        console.log("Token appears to be valid Google token");
        // Get user profile information
        const userInfo = await fetchGoogleUserInfo(validToken);

        if (userInfo) {
          // Save user data
          currentUser = {
            accessToken: validToken,
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            loginTime: Date.now(),
          };

          await saveToStorage(STORAGE_KEYS.USER_AUTH, currentUser);
          updateUserInterface(true);

          setStatus("✅ Connexion réussie ! Bienvenue, " + userInfo.name);

          // Clear status after a few seconds
          setTimeout(() => {
            if (statusDiv.textContent.includes("Connexion réussie")) {
              setStatus("");
            }
          }, 3000);
        } else {
          throw new Error("Failed to fetch user information");
        }
      } else {
        console.error(
          "Token doesn't appear to be a valid Google token:",
          validToken
        );
        throw new Error("Invalid Google token format");
      }
    } else if (token && typeof token !== "string") {
      throw new Error("Invalid token format received");
    } else {
      throw new Error("No access token received");
    }
  } catch (error) {
    console.error("Google Sign-In error:", error);
    setStatus("❌ Échec de la connexion. Veuillez réessayer.");

    // Re-enable sign-in button on error
    authGateSigninBtn.disabled = false;

    // Clear status after a few seconds
    setTimeout(() => {
      if (statusDiv.textContent.includes("Échec de la connexion")) {
        setStatus("");
      }
    }, 3000);
  }
}

/**
 * Handle Google Sign-Out
 */
async function handleGoogleSignOut() {
  try {
    setStatus("👋 Déconnexion en cours...");

    // Re-enable sign-in button immediately
    authGateSigninBtn.disabled = false;

    if (currentUser && currentUser.accessToken) {
      // Revoke the access token with Google
      try {
        const revokeResponse = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(
            currentUser.accessToken
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        if (revokeResponse.ok) {
          console.log("Token successfully revoked with Google");
        } else {
          console.warn(
            "Failed to revoke token with Google, but continuing with logout"
          );
        }
      } catch (revokeError) {
        console.warn("Error revoking token with Google:", revokeError);
        // Continue with logout even if revocation fails
      }

      // Remove cached token from Chrome
      try {
        await chrome.identity.removeCachedAuthToken({
          token: currentUser.accessToken,
        });
        console.log("Token removed from Chrome cache");
      } catch (cacheError) {
        console.warn("Error removing token from Chrome cache:", cacheError);
        // Continue with logout even if cache removal fails
      }
    }

    // Clear user data
    currentUser = null;
    await clearStorageKey(STORAGE_KEYS.USER_AUTH);

    // Update UI
    updateUserInterface(false);

    // Reset all button states
    resetButtonStates();

    setStatus("👋 Déconnexion réussie !");

    // Clear status after a few seconds
    setTimeout(() => {
      if (statusDiv.textContent.includes("Déconnexion réussie")) {
        setStatus("");
      }
    }, 2000);
  } catch (error) {
    console.error("Google Sign-Out error:", error);
    setStatus("❌ Erreur lors de la déconnexion.");
  }
}

/**
 * Fetch user information from Google API
 */
async function fetchGoogleUserInfo(accessToken) {
  try {
    console.log("fetchGoogleUserInfo - Access token type:", typeof accessToken);
    console.log("fetchGoogleUserInfo - Access token value:", accessToken);
    console.log(
      "fetchGoogleUserInfo - Access token length:",
      accessToken?.length
    );

    // Ensure we have a valid token string
    if (!accessToken || typeof accessToken !== "string") {
      console.error(
        "Invalid access token provided to fetchGoogleUserInfo:",
        accessToken
      );
      throw new Error("Invalid access token provided");
    }

    // Additional check to ensure it's not [object Object]
    if (
      accessToken === "[object Object]" ||
      accessToken.includes("object Object")
    ) {
      console.error("Token is [object Object], cannot proceed");
      throw new Error("Token is not a valid string");
    }

    // First, try to get token info to validate the token
    const apiUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(
      accessToken
    )}`;
    console.log("Making API call to:", apiUrl);
    console.log("Encoded token:", encodeURIComponent(accessToken));

    const tokenResponse = await fetch(apiUrl);

    console.log("Token info response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token validation error:", errorText);
      throw new Error(
        `Token validation failed: ${tokenResponse.status} - ${errorText}`
      );
    }

    const tokenInfo = await tokenResponse.json();
    console.log("Token info received:", tokenInfo);

    // Create user info from token info (more reliable for Chrome extensions)
    console.log("Creating user info from token");

    // Generate a more user-friendly name from email
    const emailPrefix = tokenInfo.email.split("@")[0];
    const displayName = emailPrefix
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const userInfo = {
      id: tokenInfo.user_id,
      email: tokenInfo.email,
      name: displayName,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        displayName
      )}&background=random&color=fff&size=200`,
    };
    console.log("User info created:", userInfo);
    return userInfo;
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return null;
  }
}

/**
 * Verify if Google token is still valid
 */
async function verifyGoogleToken(accessToken) {
  try {
    // Ensure we have a valid token string
    if (!accessToken || typeof accessToken !== "string") {
      console.error("Invalid access token for verification");
      return false;
    }

    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    return response.ok;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}

/**
 * Update user avatar with fallback
 */
function updateUserAvatar(avatarUrl, userName) {
  if (avatarUrl && avatarUrl.trim() !== "") {
    // Show avatar image
    userAvatar.src = avatarUrl;
    userAvatar.alt = userName || "Avatar utilisateur";
    userAvatar.classList.remove("hidden");
    userAvatarFallback.classList.add("hidden");
  } else {
    // Show fallback icon
    userAvatar.classList.add("hidden");
    userAvatarFallback.classList.remove("hidden");
  }
}

/**
 * Update user interface based on authentication state
 */
function updateUserInterface(isAuthenticated) {
  if (isAuthenticated && currentUser) {
    // Show main content and hide auth gate
    authGate.classList.add("hidden");
    mainContent.classList.remove("hidden");

    // Show user profile in header
    userProfile.classList.remove("hidden");

    // Update user information
    updateUserAvatar(currentUser.picture, currentUser.name);
    userName.textContent = currentUser.name || "Utilisateur";
    userEmail.textContent = currentUser.email || "";
  } else {
    // Show auth gate and hide main content
    authGate.classList.remove("hidden");
    mainContent.classList.add("hidden");

    // Hide user profile
    userProfile.classList.add("hidden");

    // Re-enable sign-in button when showing unauthenticated state
    authGateSigninBtn.disabled = false;
  }
}

/**
 * Get current user information
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 */
function isUserAuthenticated() {
  return currentUser !== null && currentUser.accessToken !== null;
}

/**
 * Reset all button states to enabled
 */
function resetButtonStates() {
  // Re-enable sign-in button
  authGateSigninBtn.disabled = false;

  // Re-enable other buttons that might be disabled
  generateButton.disabled = false;
  addToCartButton.disabled = false;
  buyNowButton.disabled = false;

  console.log("All button states reset to enabled");
}

/**
 * Test logout functionality
 */
async function testLogout() {
  console.log("Testing logout functionality...");
  console.log("Before logout - isAuthenticated:", isUserAuthenticated());
  console.log("Before logout - currentUser:", currentUser);

  await handleGoogleSignOut();

  // Wait a moment for logout to complete
  setTimeout(() => {
    console.log("After logout - isAuthenticated:", isUserAuthenticated());
    console.log("After logout - currentUser:", currentUser);

    // Check storage
    chrome.storage.local.get([STORAGE_KEYS.USER_AUTH]).then((result) => {
      console.log("After logout - storage:", result);
    });
  }, 1000);
}

// --- Handlers ---

/**
 * Handles the user selecting a person image file.
 */
async function handlePersonImageSelection() {
  const file = personImageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      personPreviewImage.src = e.target.result;
      personPreviewContainer.classList.remove("hidden");
      // Hide upload container when preview is shown
      document
        .getElementById("person-upload-container")
        .classList.add("hidden");

      // Save the uploaded image to storage
      await saveUploadedImage(file);

      // Update layout state
      updateGenerateButtonState();
    };
    reader.readAsDataURL(file);
  } else {
    personPreviewContainer.classList.add("hidden");
    personPreviewImage.src = "";
    // Show upload container when no file is selected
    document
      .getElementById("person-upload-container")
      .classList.remove("hidden");

    // Clear the uploaded image from storage
    await clearStorageKey(STORAGE_KEYS.UPLOADED_IMAGE);

    // Update layout state
    updateGenerateButtonState();
  }
}

/**
 * Handles clicking on the person file picker button to change selection
 */
async function handlePersonPreviewClick() {
  // Trigger the file input dialog
  personImageInput.click();
}

/**
 * Renders the gallery of images found on the page.
 * @param {string[]} imageUrls - An array of image source URLs.
 */
function renderImageGallery(imageUrls) {
  galleryContainer.innerHTML = ""; // Clear loading text/old content

  if (!imageUrls || imageUrls.length === 0) {
    galleryContainer.innerHTML = `
      <div class="gallery-loading">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
        <p class="loading-text">Aucune image appropriée trouvée sur cette page.</p>
        <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
          Essayez de naviguer sur un site de vêtements ou de mode pour de meilleurs résultats.
        </p>
      </div>
    `;
    return;
  }

  imageUrls.forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.decoding = "async";
    img.title = "Cliquez pour sélectionner cet article";
    img.crossOrigin = "anonymous"; // Try to enable CORS for the image

    // Handle image load errors (including CORS issues)
    img.addEventListener("error", (e) => {
      console.warn(`Failed to load image: ${url}`, e);
      // Add error class instead of inline styles
      img.classList.add("image-error");
      img.title = "L'image peut ne pas être accessible";
    });

    img.addEventListener("load", () => {
      // Remove error class on successful load
      img.classList.remove("image-error");
      img.title = "Cliquez pour sélectionner cet article";
    });

    img.addEventListener("click", () => handleImageSelection(url));
    galleryContainer.appendChild(img);
  });
}

/**
 * Handles the user clicking on an image in the gallery.
 * @param {string} url - The URL of the selected image.
 */
async function handleImageSelection(url) {
  selectedClothingUrl = url;
  previewImage.src = url;

  // Update UI
  galleryContainer.classList.add("hidden");
  previewContainer.classList.remove("hidden");

  // Save the selected clothing URL to storage
  await saveToStorage(STORAGE_KEYS.SELECTED_CLOTHING_URL, url);

  // Update layout state
  updateGenerateButtonState();
}

/**
 * Handles clicking on the clothing selection button to change selection
 */
async function handleClothingPreviewClick() {
  // Reset selection
  selectedClothingUrl = null;
  previewImage.src = "";

  // Update UI
  previewContainer.classList.add("hidden");
  galleryContainer.classList.remove("hidden");

  // Clear the selected clothing URL from storage
  await clearStorageKey(STORAGE_KEYS.SELECTED_CLOTHING_URL);

  // Update layout state
  updateGenerateButtonState();
}

/**
 * Enables or disables the generate button based on inputs.
 */
function updateGenerateButtonState() {
  const personPhotoSelected = personImageInput.files.length > 0;
  const clothingSelected = !!selectedClothingUrl;
  const canGenerate = personPhotoSelected && clothingSelected;
  generateButton.disabled = !canGenerate;
  enableDownload(!!resultImage.src);

  // Update layout based on selection state
  updateLayoutState(personPhotoSelected, clothingSelected);
}

/**
 * Update layout state based on image selections
 */
function updateLayoutState(personSelected, clothingSelected) {
  const stepsContainer = document.querySelector(".steps-container");

  if (personSelected && clothingSelected) {
    stepsContainer.classList.add("both-selected");
  } else {
    stepsContainer.classList.remove("both-selected");
  }
}

/**
 * Creates a collage with uploaded image, selected clothing image, generated result, and product details
 * @returns {Promise<string>} - Data URL of the generated collage
 */
async function createCollage() {
  return new Promise((resolve, reject) => {
    try {
      // Get all required images
      const uploadedImageSrc = personPreviewImage.src;
      const selectedImageSrc = previewImage.src;
      const generatedImageSrc = resultImage.src;

      if (!uploadedImageSrc || !selectedImageSrc || !generatedImageSrc) {
        reject(new Error("Missing required images for collage"));
        return;
      }

      // Get product information
      const productInfo = extractProductInfo();

      // Create canvas for collage
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions (wider for horizontal layout, sufficient height to prevent overlap)
      const canvasWidth = 1400;
      const canvasHeight = 700; // Increased height to prevent overlap between images and details
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill background with gradient
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvasWidth,
        canvasHeight
      );
      gradient.addColorStop(0, "#f8fafc");
      gradient.addColorStop(1, "#e2e8f0");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Add header with title and logo
      ctx.fillStyle = "#1e293b";
      ctx.font =
        'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "center";

      // Draw "TryON - Résultat d'Essayage Virtuel" text
      ctx.fillText("TryON - Résultat d'Essayage Virtuel", canvasWidth / 2, 50);

      // Add subtitle
      ctx.fillStyle = "#64748b";
      ctx.font =
        '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        "Généré le " + new Date().toLocaleDateString("fr-FR"),
        canvasWidth / 2,
        80
      );

      // Image dimensions and layout
      const imageSize = 220;
      const spacing = 100; // Increased spacing for clear separation
      const startY = 120;
      const centerX = canvasWidth / 2;

      // Calculate positions for horizontal layout with proper spacing
      const totalWidth = imageSize * 3 + spacing * 2; // Total width needed
      const startX = (canvasWidth - totalWidth) / 2; // Start position to center everything

      const uploadedX = startX; // Leftmost position
      const generatedX = startX + imageSize + spacing; // Center position
      const selectedX = startX + (imageSize + spacing) * 2; // Rightmost position

      // Load and draw images
      const images = [
        {
          src: uploadedImageSrc,
          label: "Votre Photo",
          x: uploadedX,
          y: startY,
        },
        {
          src: selectedImageSrc,
          label: "Article Sélectionné",
          x: generatedX,
          y: startY,
        },
        {
          src: generatedImageSrc,
          label: "Résultat Final",
          x: selectedX,
          y: startY,
        },
      ];

      // Load NUSENSE logo
      const logoImage = new Image();
      logoImage.crossOrigin = "anonymous";

      let loadedImages = 0;
      const totalImages = images.length + 1; // +1 for logo

      // Function to check if all images are loaded
      const checkAllLoaded = () => {
        if (loadedImages === totalImages) {
          // Draw separators between images
          drawSeparators(
            ctx,
            uploadedX,
            generatedX,
            selectedX,
            imageSize,
            startY
          );

          // Add product details section
          addProductDetailsToCollage(
            ctx,
            productInfo,
            canvasWidth,
            canvasHeight
          );
          resolve(canvas.toDataURL("image/png", 1.0));
        }
      };

      images.forEach((imageData, index) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          // Draw image with border
          ctx.strokeStyle = "#ef5746";
          ctx.lineWidth = 4;
          ctx.strokeRect(
            imageData.x - 2,
            imageData.y - 2,
            imageSize + 4,
            imageSize + 4
          );

          // Draw image maintaining aspect ratio
          const aspectRatio = img.width / img.height;
          let drawWidth = imageSize;
          let drawHeight = imageSize;
          let offsetX = 0;
          let offsetY = 0;

          if (aspectRatio > 1) {
            // Image is wider than tall
            drawHeight = imageSize / aspectRatio;
            offsetY = (imageSize - drawHeight) / 2;
          } else {
            // Image is taller than wide
            drawWidth = imageSize * aspectRatio;
            offsetX = (imageSize - drawWidth) / 2;
          }

          ctx.drawImage(
            img,
            imageData.x + offsetX,
            imageData.y + offsetY,
            drawWidth,
            drawHeight
          );

          // Draw label
          ctx.fillStyle = "#1e293b";
          ctx.font =
            'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = "center";
          ctx.fillText(
            imageData.label,
            imageData.x + imageSize / 2,
            imageData.y + imageSize + 25
          );

          loadedImages++;
          checkAllLoaded();
        };

        img.onerror = () => {
          console.error(`Failed to load image: ${imageData.src}`);
          loadedImages++;
          checkAllLoaded();
        };

        img.src = imageData.src;
      });

      // Load and draw NUSENSE logo
      logoImage.onload = () => {
        // Calculate text width to position logo properly
        const text = "TryON - Résultat d'Essayage Virtuel";
        const textWidth = ctx.measureText(text).width;

        // Draw logo in the header area - positioned to the left of text with proper spacing
        const logoHeight = 28; // Fixed height to maintain aspect ratio
        const logoWidth = (logoImage.width / logoImage.height) * logoHeight; // Maintain aspect ratio
        const logoSpacing = 20; // Increased space between logo and text
        const logoX =
          canvasWidth / 2 - textWidth / 2 - logoWidth - logoSpacing - 150; // Move 150px further left
        const logoY = 40 - logoHeight / 2; // Move logo up by 10px

        // Draw logo with subtle shadow for better visibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Also draw smaller logo in footer - properly aligned with text
        const footerText = "Généré par - Alimenté par l'IA";
        const footerTextWidth = ctx.measureText(footerText).width;
        const footerLogoHeight = 12;
        const footerLogoWidth =
          (logoImage.width / logoImage.height) * footerLogoHeight;
        const footerLogoSpacing = 8; // Space between logo and text
        const footerLogoX =
          canvasWidth / 2 -
          footerTextWidth / 2 -
          footerLogoWidth -
          footerLogoSpacing;
        const footerLogoY = canvasHeight - 15 - footerLogoHeight / 2; // Center vertically with footer text

        ctx.drawImage(
          logoImage,
          footerLogoX,
          footerLogoY,
          footerLogoWidth,
          footerLogoHeight
        );

        loadedImages++;
        checkAllLoaded();
      };

      logoImage.onerror = () => {
        console.error("Failed to load NUSENSE logo");
        loadedImages++;
        checkAllLoaded();
      };

      logoImage.src = "NUSENSE_LOGO.svg";
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draws separators between images
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} uploadedX - X position of uploaded image
 * @param {number} generatedX - X position of generated image
 * @param {number} selectedX - X position of selected image
 * @param {number} imageSize - Size of images
 * @param {number} startY - Y position of images
 */
function drawSeparators(
  ctx,
  uploadedX,
  generatedX,
  selectedX,
  imageSize,
  startY
) {
  const centerY = startY + imageSize / 2;

  // Draw "+" between uploaded and selected images (now in center)
  const plusX = uploadedX + imageSize + 50; // Position in the middle of the spacing
  ctx.fillStyle = "#ef5746";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("+", plusX, centerY + 15);

  // Draw "=" between selected and generated images (now on right)
  const equalX = generatedX + imageSize + 50; // Position in the middle of the spacing
  ctx.fillStyle = "#ef5746";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("=", equalX, centerY + 10);
}

/**
 * Adds product details to the collage
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} productInfo - Product information object
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function addProductDetailsToCollage(
  ctx,
  productInfo,
  canvasWidth,
  canvasHeight
) {
  const detailsStartY = 400; // Moved further down to prevent overlap with images
  const detailsWidth = canvasWidth - 100;
  const detailsX = 50;
  const detailsHeight = canvasHeight - detailsStartY - 50;

  // Add product details background
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillRect(detailsX, detailsStartY, detailsWidth, detailsHeight);

  // Add border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(detailsX, detailsStartY, detailsWidth, detailsHeight);

  // Add product details title
  ctx.fillStyle = "#1e293b";
  ctx.font =
    'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("Détails du Produit", detailsX + 20, detailsStartY + 25);

  // Grid layout parameters
  const gridPadding = 20;
  const cellPadding = 15;
  const maxColumns = 3;
  const cellWidth = (detailsWidth - gridPadding * 2) / maxColumns;
  const cellHeight = 40; // Increased cell height for better readability
  const lineHeight = 16;

  // Define all product details to display (excluding name and description)
  const productDetails = [
    {
      label: "Prix",
      value: `${productInfo.price.toFixed(2)} €`,
      highlight: true,
    },
    { label: "Marque", value: productInfo.brand, highlight: false },
    { label: "Catégorie", value: productInfo.category, highlight: false },
    {
      label: "Disponibilité",
      value: productInfo.availability,
      highlight: false,
    },
    { label: "Note", value: productInfo.rating, highlight: false },
    { label: "Tailles", value: productInfo.sizes, highlight: false },
    { label: "Couleurs", value: productInfo.colors, highlight: false },
    { label: "Matière", value: productInfo.material, highlight: false },
  ];

  // Draw grid items
  let currentRow = 0;
  let currentCol = 0;
  let startY = detailsStartY + 50;

  productDetails.forEach((detail, index) => {
    const x = detailsX + gridPadding + currentCol * cellWidth;
    const y = startY + currentRow * cellHeight;

    // Draw cell background
    ctx.fillStyle =
      index % 2 === 0 ? "rgba(248, 250, 252, 0.8)" : "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(x, y, cellWidth - cellPadding, cellHeight - 5);

    // Draw cell border
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellWidth - cellPadding, cellHeight - 5);

    // Draw label
    ctx.fillStyle = "#64748b";
    ctx.font =
      'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(detail.label + ":", x + 8, y + 15);

    // Draw value
    ctx.fillStyle = detail.highlight ? "#ef5746" : "#1e293b";
    ctx.font = detail.highlight
      ? 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Truncate long values
    let displayValue = detail.value;
    const maxWidth = cellWidth - cellPadding - 16;
    const metrics = ctx.measureText(displayValue);

    if (metrics.width > maxWidth) {
      while (
        ctx.measureText(displayValue + "...").width > maxWidth &&
        displayValue.length > 0
      ) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += "...";
    }

    ctx.fillText(displayValue, x + 8, y + 32);

    // Move to next position
    currentCol++;
    if (currentCol >= maxColumns) {
      currentCol = 0;
      currentRow++;
    }
  });

  // Add footer with logo
  ctx.fillStyle = "#9ca3af";
  ctx.font =
    '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = "center";

  // Draw footer text (logo will be drawn separately)
  const footerText = "Généré par - Alimenté par l'IA";
  const footerX = canvasWidth / 2;
  const footerY = canvasHeight - 15;

  // Draw text (logo will be positioned by the logo loading function)
  ctx.fillText(footerText, footerX, footerY);

  // Draw copyright text below the main footer text
  const copyrightText = "© 2025 NUSENSE. Tous droits réservés.";
  const copyrightY = canvasHeight - 5;
  ctx.fillText(copyrightText, footerX, copyrightY);
}

/**
 * Handles downloading just the generated result image (single image).
 */
async function handleDownloadResultImage() {
  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus(
      "🔐 Veuillez vous connecter avec Google pour télécharger des images."
    );
    return;
  }

  if (!resultImage.src) {
    setStatus("Aucune image à télécharger.");
    return;
  }

  try {
    setStatus("📥 Téléchargement de votre image...");

    // Add visual feedback to the result download button only
    if (resultDownloadButton) {
      resultDownloadButton.classList.add("button-loading");
      resultDownloadButton.disabled = true;
    }

    // Create download link for the single result image
    const link = document.createElement("a");
    link.href = resultImage.src;
    link.download = `nusense-tryon-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatus(
      "💾 Image téléchargée avec succès ! Vérifiez votre dossier de téléchargements."
    );

    // Add success animation to result download button only
    if (resultDownloadButton) {
      resultDownloadButton.classList.remove("button-loading");
      resultDownloadButton.classList.add("button-success");
      setTimeout(() => {
        resultDownloadButton.classList.remove("button-success");
        resultDownloadButton.disabled = false;
      }, 600);
    }
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("❌ Échec du téléchargement. Veuillez réessayer.");

    // Reset button state on error
    if (resultDownloadButton) {
      resultDownloadButton.classList.remove("button-loading");
      resultDownloadButton.classList.add("button-error");
      setTimeout(() => {
        resultDownloadButton.classList.remove("button-error");
        resultDownloadButton.disabled = false;
      }, 500);
    }
  }
}

/**
 * Handles downloading the generated collage with all images and product details.
 */
async function handleDownloadImage() {
  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus(
      "🔐 Veuillez vous connecter avec Google pour télécharger des images."
    );
    return;
  }

  if (!resultImage.src) {
    setStatus("Aucune image à télécharger.");
    return;
  }

  try {
    setStatus("🎨 Création de votre collage personnalisé...");

    // Add visual feedback to download buttons
    const downloadButtons = [downloadButton];
    if (resultDownloadButton) {
      downloadButtons.push(resultDownloadButton);
    }

    downloadButtons.forEach((btn) => {
      btn.classList.add("button-loading");
      btn.disabled = true;
    });

    // Create the collage
    const collageDataUrl = await createCollage();

    // Download the collage
    const link = document.createElement("a");
    link.href = collageDataUrl;
    link.download = `nusense-tryon-collage-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatus(
      "💾 Collage téléchargé avec succès ! Vérifiez votre dossier de téléchargements."
    );

    // Add success animation
    downloadButtons.forEach((btn) => {
      btn.classList.remove("button-loading");
      btn.classList.add("button-success");
      setTimeout(() => {
        btn.classList.remove("button-success");
        btn.disabled = false;
      }, 600);
    });
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("❌ Échec du téléchargement. Veuillez réessayer.");

    // Reset button states on error
    const downloadButtons = [downloadButton];
    if (resultDownloadButton) {
      downloadButtons.push(resultDownloadButton);
    }

    downloadButtons.forEach((btn) => {
      btn.classList.remove("button-loading");
      btn.classList.add("button-error");
      setTimeout(() => {
        btn.classList.remove("button-error");
        btn.disabled = false;
      }, 500);
    });
  }
}

/**
 * Handles the Buy Now button click
 */
function handleBuyNow() {
  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus(
      "🔐 Veuillez vous connecter avec Google pour effectuer un achat."
    );
    return;
  }

  if (!selectedClothingUrl) {
    setStatus("📸 Veuillez d'abord sélectionner un article de vêtement.");
    return;
  }

  // Extract product information and proceed to checkout
  const productInfo = extractProductInfo();

  setStatus("🛒 Redirection vers la page d'achat...");

  // Simulate opening the product page in a new tab
  setTimeout(() => {
    setStatus("🎉 Redirection vers la page d'achat réussie !");
    // In a real implementation, you would:
    // window.open(productInfo.url || selectedClothingUrl, '_blank');
    // or redirect to a checkout page with the product info
  }, 1000);
}

/**
 * Handles the Add to Cart button click
 */
async function handleAddToCart() {
  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus(
      "🔐 Veuillez vous connecter avec Google pour ajouter des articles au panier."
    );
    return;
  }

  if (!selectedClothingUrl) {
    setStatus("📸 Veuillez d'abord sélectionner un article de vêtement.");
    return;
  }

  try {
    // Extract product information
    const productInfo = extractProductInfo();

    // Add to cart with enhanced error handling
    const result = await addItemToCart(productInfo);

    if (result.success) {
      // Show appropriate success message based on whether item was existing
      const message = result.wasExisting
        ? "➕ Quantité mise à jour dans le panier !"
        : "➕ Article ajouté au panier avec succès !";

      setStatus(message);

      // Add visual feedback with enhanced animations
      addToCartButton.classList.add("button-press");
      addToCartButton.classList.add("button-success");

      setTimeout(() => {
        addToCartButton.classList.remove("button-press");
        addToCartButton.classList.remove("button-success");
      }, 600);

      setTimeout(() => {
        const followUpMessage = result.wasExisting
          ? "🛒 La quantité a été augmentée dans votre panier."
          : "🛒 L'article a été ajouté à votre panier.";
        setStatus(followUpMessage);
      }, 1500);
    } else {
      throw new Error("Failed to add item to cart");
    }
  } catch (error) {
    console.error("Failed to add to cart:", error);
    setStatus("❌ Erreur lors de l'ajout au panier. Veuillez réessayer.");

    // Add error visual feedback
    addToCartButton.classList.add("button-error");
    setTimeout(() => {
      addToCartButton.classList.remove("button-error");
    }, 500);
  }
}

/**
 * Handles the Try In Store button click
 */
function handleTryInStore() {
  if (!resultImage.src) {
    setStatus("🖼️ Générez d'abord un essayage pour continuer.");
    return;
  }

  setStatus("🏬 Fonctionnalité 'essayer en magasin' bientôt disponible.");
}

/**
 * Extract product information from the current page
 */
function extractProductInfo() {
  const productInfo = {
    id: generateProductId(),
    name: extractProductName(),
    price: extractProductPrice(),
    image: selectedClothingUrl,
    url: window.location.href,
    description: extractProductDescription(),
    sizes: extractProductSizes(),
    colors: extractProductColors(),
    brand: extractProductBrand(),
    category: extractProductCategory(),
    availability: extractProductAvailability(),
    rating: extractProductRating(),
    material: extractProductMaterial(),
    timestamp: Date.now(),
  };

  currentProductInfo = productInfo;
  return productInfo;
}

/**
 * Generate a stable product ID based on product information
 */
function generateProductId() {
  // Create a stable ID based on the selected clothing URL and current page
  const baseUrl = selectedClothingUrl || window.location.href;
  const pageUrl = window.location.href;

  // Create a hash-like ID from the URL and page information
  const urlHash = btoa(baseUrl + pageUrl)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 16);

  return `product_${urlHash}`;
}

/**
 * Extract product name from the page
 */
function extractProductName() {
  // Try to find product name from common selectors
  const selectors = [
    'h1[data-testid*="product"]',
    ".product-title",
    ".product-name",
    "h1",
    '[data-testid*="title"]',
    ".title",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  return "Article de vêtement";
}

/**
 * Extract product price from the page
 */
function extractProductPrice() {
  // Comprehensive price selectors for various e-commerce platforms
  const selectors = [
    // Common e-commerce selectors
    '[data-testid*="data-v-69359d06"]',
    '[data-testid*="cost"]',
    '[data-testid*="amount"]',
    '[data-testid*="value"]',
    ".price",
    ".product-price",
    ".current-price",
    ".sale-price",
    ".final-price",
    ".price-current",
    ".price-now",
    ".price-value",
    '[class*="price"]',
    '[class*="cost"]',
    '[class*="amount"]',

    // Platform-specific selectors
    ".a-price-whole", // Amazon
    ".a-offscreen", // Amazon
    ".price-box__price", // Shopify
    ".product-price__current", // Shopify
    ".price-current", // Magento
    ".price-box .price", // Magento
    ".product-price-value", // WooCommerce
    ".woocommerce-Price-amount", // WooCommerce
    ".price-current", // BigCommerce
    ".product-price", // BigCommerce

    // Generic selectors
    '[itemprop="price"]',
    '[itemprop="priceCurrency"]',
    ".money",
    ".currency",
    ".amount",
    ".value",

    // Meta tags
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="price"]',
  ];

  // Try each selector
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      if (element && element.textContent) {
        const priceText = element.textContent.trim();

        // Enhanced price parsing patterns
        const pricePatterns = [
          /€\s*([\d,]+\.?\d*)/, // €29.99
          /\$\s*([\d,]+\.?\d*)/, // $29.99
          /£\s*([\d,]+\.?\d*)/, // £29.99
          /([\d,]+\.?\d*)\s*€/, // 29.99€
          /([\d,]+\.?\d*)\s*\$/, // 29.99$
          /([\d,]+\.?\d*)\s*£/, // 29.99£
          /([\d,]+\.?\d*)/, // Just numbers
        ];

        for (const pattern of pricePatterns) {
          const match = priceText.match(pattern);
          if (match) {
            const priceValue = parseFloat(match[1].replace(",", ""));
            if (priceValue > 0 && priceValue < 10000) {
              // Reasonable price range
              console.log(
                `Found price: ${priceValue} from selector: ${selector}`
              );
              return priceValue;
            }
          }
        }
      }

      // Check content attribute for meta tags
      if (element.content) {
        const priceValue = parseFloat(element.content.replace(",", ""));
        if (priceValue > 0 && priceValue < 10000) {
          console.log(`Found price: ${priceValue} from meta tag: ${selector}`);
          return priceValue;
        }
      }
    }
  }

  // Try to find price in JSON-LD structured data
  try {
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    for (const script of jsonLdScripts) {
      const data = JSON.parse(script.textContent);
      if (data && (data.price || data.offers?.price)) {
        const price = data.price || data.offers?.price;
        const priceValue = parseFloat(price);
        if (priceValue > 0 && priceValue < 10000) {
          console.log(`Found price: ${priceValue} from JSON-LD`);
          return priceValue;
        }
      }
    }
  } catch (error) {
    console.log("Error parsing JSON-LD:", error);
  }

  console.log("No price found, using default");
  return 29.99; // Default price
}

/**
 * Extract product description from the page
 */
function extractProductDescription() {
  const selectors = [
    ".product-description",
    ".description",
    '[data-testid*="description"]',
    ".product-details",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim().substring(0, 200) + "...";
    }
  }

  return "Article de vêtement sélectionné pour l'essayage virtuel.";
}

/**
 * Extract available sizes from the page
 */
function extractProductSizes() {
  // Comprehensive size selectors for various e-commerce platforms
  const sizeSelectors = [
    // Common e-commerce selectors
    '[data-testid*="size"]',
    '[data-testid*="variant"]',
    '[data-testid*="option"]',
    ".size-selector",
    ".product-sizes",
    ".size-options",
    ".variant-selector",
    ".size-chooser",
    ".size-picker",
    '[class*="size"]',
    '[class*="variant"]',
    '[class*="option"]',

    // Platform-specific selectors
    ".swatch-option", // Magento
    ".swatch-attribute-options", // Magento
    ".product-options", // Magento
    ".variant-selector", // Shopify
    ".product-form__input", // Shopify
    ".single-option-selector", // Shopify
    ".variation-select", // WooCommerce
    ".variation-selector", // WooCommerce
    ".product-options", // WooCommerce
    ".size-chart", // Various platforms
    ".size-guide", // Various platforms

    // Generic selectors
    ".option",
    ".choice",
    ".select",
    ".picker",
    ".swatch",
  ];

  // Try each selector
  for (const selector of sizeSelectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      if (element) {
        // Look for size elements within the container
        const sizeElements = element.querySelectorAll(
          "button, span, div, option, input[type='radio'], input[type='checkbox']"
        );
        const sizes = [];

        for (const el of sizeElements) {
          const text =
            el.textContent?.trim() ||
            el.value?.trim() ||
            el.getAttribute("data-value")?.trim();
          if (text) {
            // Enhanced size pattern matching
            const sizePatterns = [
              /^[XS|S|M|L|XL|XXL|XXXL]+$/, // Standard sizes
              /^\d+$/, // Numeric sizes (28, 30, 32, etc.)
              /^\d+\.\d+$/, // Decimal sizes (28.5, 30.5, etc.)
              /^[0-9]+[A-Z]*$/, // Size with letter (28A, 30B, etc.)
              /^[A-Z]+\d+$/, // Letter with number (S28, M30, etc.)
              /^[0-9]+-[0-9]+$/, // Size ranges (28-30, 32-34, etc.)
              /^[A-Z]+-[A-Z]+$/, // Letter ranges (S-M, L-XL, etc.)
            ];

            for (const pattern of sizePatterns) {
              if (pattern.test(text) && text.length <= 10) {
                // Reasonable size length
                sizes.push(text);
                break;
              }
            }
          }
        }

        if (sizes.length > 0) {
          // Remove duplicates and limit to reasonable number
          const uniqueSizes = [...new Set(sizes)].slice(0, 12);
          console.log(
            `Found sizes: ${uniqueSizes.join(", ")} from selector: ${selector}`
          );
          return uniqueSizes.join(", ");
        }
      }
    }
  }

  // Try to find sizes in JSON-LD structured data
  try {
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    for (const script of jsonLdScripts) {
      const data = JSON.parse(script.textContent);
      if (data && data.offers && Array.isArray(data.offers)) {
        const sizes = [];
        for (const offer of data.offers) {
          if (offer.itemOffered && offer.itemOffered.size) {
            sizes.push(offer.itemOffered.size);
          }
        }
        if (sizes.length > 0) {
          console.log(`Found sizes: ${sizes.join(", ")} from JSON-LD`);
          return sizes.join(", ");
        }
      }
    }
  } catch (error) {
    console.log("Error parsing JSON-LD for sizes:", error);
  }

  // Try to find sizes in meta tags
  const metaSelectors = [
    'meta[property="product:size"]',
    'meta[name="size"]',
    'meta[property="og:size"]',
  ];

  for (const selector of metaSelectors) {
    const element = document.querySelector(selector);
    if (element && element.content) {
      const sizes = element.content
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (sizes.length > 0) {
        console.log(
          `Found sizes: ${sizes.join(", ")} from meta tag: ${selector}`
        );
        return sizes.join(", ");
      }
    }
  }

  console.log("No sizes found, using default");
  return "S, M, L, XL"; // Default sizes
}

/**
 * Extract available colors from the page
 */
function extractProductColors() {
  const colorSelectors = [
    '[data-testid*="color"]',
    ".color-selector",
    ".product-colors",
    ".color-options",
    '[class*="color"]',
  ];

  for (const selector of colorSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const colorElements = element.querySelectorAll("button, span, div");
      const colors = Array.from(colorElements)
        .map((el) => el.textContent.trim())
        .filter((text) => text && text.length < 20)
        .slice(0, 6); // Limit to 6 colors

      if (colors.length > 0) {
        return colors.join(", ");
      }
    }
  }

  return "Noir, Blanc, Bleu"; // Default colors
}

/**
 * Extract product brand from the page
 */
function extractProductBrand() {
  const brandSelectors = [
    '[data-testid*="brand"]',
    ".brand",
    ".product-brand",
    ".manufacturer",
    'meta[property="product:brand"]',
  ];

  for (const selector of brandSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const brand = element.textContent?.trim() || element.content?.trim();
      if (brand && brand.length < 30) {
        return brand;
      }
    }
  }

  return "Marque Inconnue";
}

/**
 * Extract product category from the page
 */
function extractProductCategory() {
  const categorySelectors = [
    '[data-testid*="category"]',
    ".category",
    ".product-category",
    ".breadcrumb",
    'meta[property="product:category"]',
  ];

  for (const selector of categorySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const category = element.textContent?.trim() || element.content?.trim();
      if (category && category.length < 30) {
        return category;
      }
    }
  }

  return "Vêtements";
}

/**
 * Extract product availability from the page
 */
function extractProductAvailability() {
  const availabilitySelectors = [
    '[data-testid*="availability"]',
    ".availability",
    ".stock-status",
    ".in-stock",
    ".out-of-stock",
  ];

  for (const selector of availabilitySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const availability = element.textContent.trim().toLowerCase();
      if (
        availability.includes("en stock") ||
        availability.includes("available")
      ) {
        return "En Stock";
      } else if (
        availability.includes("rupture") ||
        availability.includes("out of stock")
      ) {
        return "Rupture de Stock";
      }
    }
  }

  return "Disponible";
}

/**
 * Extract product rating from the page
 */
function extractProductRating() {
  const ratingSelectors = [
    '[data-testid*="rating"]',
    ".rating",
    ".product-rating",
    ".stars",
    '[class*="rating"]',
  ];

  for (const selector of ratingSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const ratingText = element.textContent.trim();
      const ratingMatch = ratingText.match(/(\d+[.,]\d+|\d+)\s*\/\s*5/);
      if (ratingMatch) {
        return ratingMatch[1] + "/5";
      }
    }
  }

  return "4.5/5";
}

/**
 * Extract product material from the page
 */
function extractProductMaterial() {
  const materialSelectors = [
    '[data-testid*="material"]',
    ".material",
    ".product-material",
    ".fabric",
    '[class*="material"]',
  ];

  for (const selector of materialSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const material = element.textContent.trim();
      if (material && material.length < 50) {
        return material;
      }
    }
  }

  return "Coton 100%";
}

/**
 * Add product to cart
 */
async function addToCart(productInfo) {
  // Validate product info
  if (
    !productInfo ||
    !productInfo.id ||
    !productInfo.name ||
    !productInfo.price
  ) {
    throw new Error("Invalid product information");
  }

  // Check if item already exists in cart
  const existingItemIndex = cartItems.findIndex(
    (item) => item.id === productInfo.id
  );

  if (existingItemIndex !== -1) {
    // Increase quantity if item already exists
    cartItems[existingItemIndex].quantity += 1;
    console.log(
      `Increased quantity for existing item: ${productInfo.name} (now ${cartItems[existingItemIndex].quantity})`
    );
  } else {
    // Add new item to cart
    cartItems.push({
      ...productInfo,
      quantity: 1,
    });
    console.log(`Added new item to cart: ${productInfo.name}`);
  }

  // Save to storage
  await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
}

/**
 * Confirm removal of item from cart
 */
function confirmRemoveFromCart(productId, itemName) {
  if (
    confirm(
      `Êtes-vous sûr de vouloir supprimer "${itemName}" de votre panier ?`
    )
  ) {
    removeFromCart(productId);
  }
}

/**
 * Remove item from cart
 */
async function removeFromCart(productId) {
  console.log("removeFromCart called with productId:", productId);
  console.log("Current cart items before removal:", cartItems);

  if (!productId) {
    console.error("Product ID is required to remove item from cart");
    return;
  }

  const initialLength = cartItems.length;
  cartItems = cartItems.filter((item) => item.id !== productId);

  console.log("Cart items after removal:", cartItems);
  console.log("Items removed:", initialLength - cartItems.length);

  // Only update storage if something was actually removed
  if (cartItems.length < initialLength) {
    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
    updateCartCount();
    renderCartItems();
    console.log("Item successfully removed from cart");

    // Show success message
    setStatus("🗑️ Article supprimé du panier !");
    setTimeout(() => {
      setStatus("🛒 Votre panier a été mis à jour.");
    }, 1500);
  } else {
    console.log("No item was removed - product ID not found");
    setStatus("❌ Erreur: Impossible de supprimer l'article.");
  }
}

/**
 * Update item quantity in cart
 */
async function updateCartItemQuantity(productId, newQuantity) {
  console.log("updateCartItemQuantity called with:", {
    productId,
    newQuantity,
  });

  if (!productId) {
    console.error("Product ID is required to update quantity");
    return;
  }

  if (typeof newQuantity !== "number" || newQuantity < 0) {
    console.error("Invalid quantity value");
    return;
  }

  const item = cartItems.find((item) => item.id === productId);
  if (item) {
    const oldQuantity = item.quantity;

    if (newQuantity <= 0) {
      // Remove item if quantity becomes 0 or negative
      await removeFromCart(productId);
    } else {
      // Update quantity
      item.quantity = newQuantity;
      await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
      updateCartCount(); // Update cart count display
      renderCartItems();

      // Show feedback message
      const quantityChange =
        newQuantity > oldQuantity ? "augmentée" : "diminuée";
      setStatus(
        `📊 Quantité ${quantityChange} : ${oldQuantity} → ${newQuantity}`
      );

      setTimeout(() => {
        setStatus("🛒 Votre panier a été mis à jour.");
      }, 1500);

      console.log(
        `Quantity updated for ${item.name}: ${oldQuantity} → ${newQuantity}`
      );
    }
  } else {
    console.error("Item not found in cart");
    setStatus("❌ Erreur: Article introuvable dans le panier.");
  }
}

/**
 * Update cart count display
 */
function updateCartCount() {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.classList.remove("hidden");
  } else {
    cartCount.classList.add("hidden");
  }
}

/**
 * Calculate cart total
 */
function calculateCartTotal() {
  return cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

/**
 * Render cart items in the modal
 */
function renderCartItems() {
  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <p>Votre panier est vide</p>
        <small>Ajoutez des articles pour commencer vos achats</small>
      </div>
    `;
    cartTotalPrice.textContent = "0,00 €";
    return;
  }

  cartItemsContainer.innerHTML = cartItems
    .map(
      (item) => `
    <div class="cart-item" data-product-id="${item.id}">
      <img src="${item.image}" alt="${
        item.name
      }" class="cart-item-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+'">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-info">
          <div class="cart-item-price">${item.price.toFixed(2)} €</div>
          ${
            item.sizes
              ? `<div class="cart-item-sizes">Tailles: ${item.sizes}</div>`
              : ""
          }
          ${
            item.brand && item.brand !== "Marque Inconnue"
              ? `<div class="cart-item-brand">${item.brand}</div>`
              : ""
          }
        </div>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-controls">
          <button class="quantity-btn quantity-decrease" data-product-id="${
            item.id
          }" data-new-quantity="${item.quantity - 1}">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn quantity-increase" data-product-id="${
            item.id
          }" data-new-quantity="${item.quantity + 1}">+</button>
        </div>
        <button class="remove-item-btn" data-product-id="${
          item.id
        }" data-product-name="${item.name}" title="Supprimer l'article">
          🗑️
        </button>
      </div>
    </div>
  `
    )
    .join("");

  cartTotalPrice.textContent = `${calculateCartTotal().toFixed(2)} €`;
}

/**
 * Load cart items from storage
 */
async function loadCartItems() {
  try {
    const storedItems = await loadFromStorage(STORAGE_KEYS.CART_ITEMS);

    // Validate stored items structure
    if (storedItems && Array.isArray(storedItems)) {
      // Filter out any invalid items
      cartItems = storedItems.filter(
        (item) =>
          item &&
          item.id &&
          item.name &&
          typeof item.price === "number" &&
          typeof item.quantity === "number" &&
          item.quantity > 0
      );
    } else {
      cartItems = [];
    }

    updateCartCount();
    console.log(`Loaded ${cartItems.length} items from cart storage`);
  } catch (error) {
    console.error("Failed to load cart items:", error);
    cartItems = [];
    updateCartCount();
  }
}

/**
 * Clear all cart items
 */
async function clearCart() {
  cartItems = [];
  await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
  updateCartCount();
  renderCartItems();
  setStatus("🗑️ Panier vidé avec succès !");
}

/**
 * Validate cart integrity and fix any issues
 */
function validateCartIntegrity() {
  let hasChanges = false;

  // Remove items with invalid data
  const validItems = cartItems.filter((item) => {
    if (
      !item ||
      !item.id ||
      !item.name ||
      typeof item.price !== "number" ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0
    ) {
      hasChanges = true;
      return false;
    }
    return true;
  });

  if (hasChanges) {
    cartItems = validItems;
    console.log("Cart integrity validated and fixed");
    return true; // Indicates changes were made
  }

  return false; // No changes needed
}

/**
 * Get cart summary for debugging
 */
function getCartSummary() {
  return {
    totalItems: cartItems.length,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: calculateCartTotal(),
    items: cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  };
}

/**
 * Debug cart state
 */
function debugCart() {
  console.log("Cart Debug Info:", getCartSummary());
  console.log("Cart Items:", cartItems);
  console.log("Storage Key:", STORAGE_KEYS.CART_ITEMS);
}

/**
 * Synchronize cart with storage
 */
async function syncCartWithStorage() {
  try {
    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
    console.log("Cart synchronized with storage");
  } catch (error) {
    console.error("Failed to sync cart with storage:", error);
  }
}

/**
 * Add item to cart with enhanced error handling
 */
async function addItemToCart(productInfo) {
  try {
    // Check if item already exists before adding
    const existingItem = cartItems.find((item) => item.id === productInfo.id);
    const wasExisting = !!existingItem;

    await addToCart(productInfo);
    await syncCartWithStorage();
    updateCartCount();

    // Return both success status and whether it was an existing item
    return { success: true, wasExisting };
  } catch (error) {
    console.error("Failed to add item to cart:", error);
    return { success: false, wasExisting: false };
  }
}

/**
 * Refresh product information for items in cart
 */
async function refreshCartItemInfo() {
  let hasUpdates = false;

  for (const item of cartItems) {
    // Only refresh if we have a valid URL and the item is from the current page
    if (item.url && item.url === window.location.href) {
      try {
        // Extract fresh product information
        const freshInfo = extractProductInfo();

        // Update price if it's different and more reasonable
        if (
          freshInfo.price !== item.price &&
          freshInfo.price > 0 &&
          freshInfo.price < 10000
        ) {
          console.log(
            `Updating price for ${item.name}: ${item.price} → ${freshInfo.price}`
          );
          item.price = freshInfo.price;
          hasUpdates = true;
        }

        // Update sizes if they're different and not default
        if (
          freshInfo.sizes !== item.sizes &&
          freshInfo.sizes !== "S, M, L, XL"
        ) {
          console.log(
            `Updating sizes for ${item.name}: ${item.sizes} → ${freshInfo.sizes}`
          );
          item.sizes = freshInfo.sizes;
          hasUpdates = true;
        }

        // Update brand if it's different and not default
        if (
          freshInfo.brand !== item.brand &&
          freshInfo.brand !== "Marque Inconnue"
        ) {
          console.log(
            `Updating brand for ${item.name}: ${item.brand} → ${freshInfo.brand}`
          );
          item.brand = freshInfo.brand;
          hasUpdates = true;
        }

        // Update other fields if they're different
        if (
          freshInfo.name !== item.name &&
          freshInfo.name !== "Article de vêtement"
        ) {
          item.name = freshInfo.name;
          hasUpdates = true;
        }

        if (freshInfo.description !== item.description) {
          item.description = freshInfo.description;
          hasUpdates = true;
        }
      } catch (error) {
        console.log(`Error refreshing info for ${item.name}:`, error);
      }
    }
  }

  // Save updated cart if there were changes
  if (hasUpdates) {
    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
    console.log("Cart item information refreshed");
  }
}

/**
 * Handle cart modal open/close
 */
function openCartModal() {
  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus("🔐 Veuillez vous connecter avec Google pour accéder au panier.");
    return;
  }

  cartModal.classList.remove("hidden");

  // Refresh product information for items in cart
  refreshCartItemInfo();

  renderCartItems();

  // Add bounce animation to cart button
  cartButton.classList.add("button-bounce");
  setTimeout(() => {
    cartButton.classList.remove("button-bounce");
  }, 600);
}

function closeCartModalHandler() {
  cartModal.classList.add("hidden");
}

/**
 * Handle checkout process
 */
async function handleCheckout() {
  if (cartItems.length === 0) {
    setStatus("🛒 Votre panier est vide. Ajoutez des articles pour continuer.");
    return;
  }

  setStatus("💳 Redirection vers le processus de commande...");

  // In a real implementation, you would redirect to a checkout page
  // with the cart items data
  setTimeout(() => {
    setStatus("🎉 Redirection vers la commande réussie !");
    closeCartModalHandler();
  }, 1500);
}

/**
 * Main function to handle form submission.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  // Check if user is authenticated
  if (!isUserAuthenticated()) {
    setStatus(
      "🔐 Veuillez vous connecter avec Google pour utiliser cette fonctionnalité."
    );
    return;
  }

  if (!personImageInput.files[0] || !selectedClothingUrl) {
    setStatus(
      "📸 Veuillez télécharger votre photo et sélectionner un article de vêtement pour continuer."
    );
    return;
  }

  // Abort any in-flight request
  if (inFlightController) {
    inFlightController.abort();
  }
  inFlightController = new AbortController();

  setStatus("🎯 Préparation de votre expérience d'essayage virtuel...");
  resultContainer.classList.add("hidden");
  resultImage.src = "";
  enableDownload(false);
  setBusy(true);

  try {
    // Step 1: Fetch the selected website image with CORS handling
    setStatus("📥 Récupération de l'image de vêtement depuis le site web...");
    updateProgressBar(20);
    const clothingBlob = await fetchImageWithCorsHandling(
      selectedClothingUrl,
      inFlightController.signal
    );

    // Step 2: Create FormData and append both images
    setStatus("🎨 Préparation des images pour la génération...");
    updateProgressBar(40);
    const formData = new FormData();
    formData.append("personImage", personImageInput.files[0]);
    // Give the blob a filename so the server's 'multer' can process it
    formData.append("clothingImage", clothingBlob, "clothing-item.jpg");

    // Add user information if authenticated
    if (isUserAuthenticated()) {
      formData.append("userId", currentUser.id);
      formData.append("email", currentUser.email);
      formData.append("name", currentUser.name);
    }

    // Step 3: Send to the backend (expects JSON response)
    setStatus("💫 Laissez-nous faire la magie... Cela peut prendre un moment.");
    updateProgressBar(60);

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Content-Language": "fr",
      },
      body: formData,
      signal: inFlightController.signal,
    });

    const data = await apiResponse.json().catch(() => null);

    // Check for error status first (even if HTTP status is not ok)
    if (data && data.status === "error") {
      showError(data);
      return; // Don't throw error, just show the error UI
    }

    if (!apiResponse.ok || !data) {
      const text = await apiResponse.text().catch(() => "");
      throw new Error(
        `Server error: ${apiResponse.status} ${apiResponse.statusText}${
          text ? " - " + text : ""
        }`
      );
    }

    // Check for success status
    if (data.status === "success" && data.image) {
      // Update progress to completion
      updateProgressBar(100);
      setStatus("✨ Finalisation de votre image personnalisée...");

      // The image is already a data URL from the backend
      resultImage.src = data.image;

      // Save the generated image to storage
      await saveGeneratedImage(data.image);

      // Show success result
      showSuccessResult();

      setStatus("🎉 Incroyable ! Votre essayage virtuel est prêt !");
      enableDownload(true);
    } else if (data.status === "success" && !data.image) {
      throw new Error("Aucune image générée dans la réponse de succès.");
    } else {
      throw new Error("Réponse invalide du serveur.");
    }

    // Add success animation to generate button
    generateButton.classList.add("button-success");
    setTimeout(() => {
      generateButton.classList.remove("button-success");
    }, 600);
  } catch (error) {
    if (error?.name === "AbortError") {
      setStatus("Demande annulée.");
    } else {
      console.error("Error:", error);

      // Provide more specific error messages for CORS issues
      if (
        error?.message?.includes("CORS") ||
        error?.message?.includes("fetch strategies failed")
      ) {
        setStatus(
          "🚫 Impossible d'accéder à l'image en raison des restrictions du site web. Essayez de sélectionner une image différente ou naviguez sur un autre site web."
        );
      } else if (error?.message?.includes("Failed to fetch")) {
        setStatus(
          "🌐 Erreur réseau : Impossible de récupérer l'image sélectionnée. Veuillez vérifier votre connexion internet et réessayer."
        );
      } else {
        setStatus(
          `❌ ${
            error?.message ||
            "Échec de la génération de votre essayage virtuel. Veuillez réessayer."
          }`
        );

        // Add error animation to generate button
        generateButton.classList.add("button-error");
        setTimeout(() => {
          generateButton.classList.remove("button-error");
        }, 500);
      }
    }
  } finally {
    setBusy(false);
    updateGenerateButtonState(); // re-enable based on current inputs
    inFlightController = null;
  }
}

/**
 * Restore previous session data from storage
 * @returns {Promise<void>}
 */
async function restorePreviousSession() {
  try {
    console.log("Restoring previous session...");

    // Restore uploaded image
    const uploadedRestored = await restoreUploadedImage();

    // Restore selected clothing URL
    const clothingRestored = await restoreSelectedClothingUrl();

    // Restore generated image
    const generatedRestored = await restoreGeneratedImage();

    if (uploadedRestored || clothingRestored || generatedRestored) {
      setStatus("📱 Session précédente restaurée avec succès !");

      // Update button states after restoration
      updateGenerateButtonState();

      // Clear status message after a few seconds
      setTimeout(() => {
        if (statusDiv.textContent.includes("Session précédente restaurée")) {
          setStatus("");
        }
      }, 3000);
    }
  } catch (error) {
    console.error("Failed to restore previous session:", error);
  }
}

// --- Event Listeners ---
form.addEventListener("submit", handleFormSubmit);
personImageInput.addEventListener("change", handlePersonImageSelection);
downloadButton.addEventListener("click", handleDownloadImage);
if (resultDownloadButton) {
  resultDownloadButton.addEventListener("click", handleDownloadResultImage);
  resultDownloadButton.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDownloadResultImage();
    }
  });
}
buyNowButton.addEventListener("click", handleBuyNow);
addToCartButton.addEventListener("click", handleAddToCart);
tryInStoreButton?.addEventListener("click", handleTryInStore);

// Authentication gate sign-in button
authGateSigninBtn.addEventListener("click", handleGoogleSignIn);
authGateSigninBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleGoogleSignIn();
  }
});

signoutBtn.addEventListener("click", handleGoogleSignOut);
signoutBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleGoogleSignOut();
  }
});

// Cart event listeners
cartButton.addEventListener("click", openCartModal);
closeCartModal.addEventListener("click", closeCartModalHandler);
clearCartButton.addEventListener("click", clearCart);
checkoutButton.addEventListener("click", handleCheckout);

// Modal overlay click to close
cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal || e.target.classList.contains("modal-overlay")) {
    closeCartModalHandler();
  }
});

// Event delegation for cart item actions
cartModal.addEventListener("click", (e) => {
  // Handle remove item button clicks
  if (e.target.classList.contains("remove-item-btn")) {
    const productId = e.target.getAttribute("data-product-id");
    const productName = e.target.getAttribute("data-product-name");
    if (productId && productName) {
      confirmRemoveFromCart(productId, productName);
    }
  }

  // Handle quantity button clicks
  if (e.target.classList.contains("quantity-btn")) {
    const productId = e.target.getAttribute("data-product-id");
    const newQuantity = parseInt(e.target.getAttribute("data-new-quantity"));

    if (productId && !isNaN(newQuantity)) {
      updateCartItemQuantity(productId, newQuantity);
    }
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!cartModal.classList.contains("hidden")) {
      closeCartModalHandler();
    }
  }

  // Quantity control shortcuts when cart is open
  if (!cartModal.classList.contains("hidden")) {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      // Increase quantity of first item (or could be enhanced to target specific item)
      if (cartItems.length > 0) {
        const firstItem = cartItems[0];
        updateCartItemQuantity(firstItem.id, firstItem.quantity + 1);
      }
    } else if (e.key === "-") {
      e.preventDefault();
      // Decrease quantity of first item
      if (cartItems.length > 0) {
        const firstItem = cartItems[0];
        updateCartItemQuantity(firstItem.id, firstItem.quantity - 1);
      }
    }
  }
});

// --- Initialization ---
// When the popup loads, ask the content script for images
document.addEventListener("DOMContentLoaded", async () => {
  // Set current year dynamically
  const currentYearElement = document.getElementById("current-year");
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  updateGenerateButtonState(); // Initial state
  enableDownload(false);

  // Load cart items from storage
  await loadCartItems();

  // Validate cart integrity
  const cartWasFixed = validateCartIntegrity();
  if (cartWasFixed) {
    // Save the fixed cart data
    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartItems);
    updateCartCount();
  }

  // Add click event listeners for preview action buttons
  if (clothingSelectionBtn) {
    clothingSelectionBtn.addEventListener("click", handleClothingPreviewClick);
    clothingSelectionBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClothingPreviewClick();
      }
    });
  }

  if (personFilePickerBtn) {
    personFilePickerBtn.addEventListener("click", handlePersonPreviewClick);
    personFilePickerBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlePersonPreviewClick();
      }
    });
  }

  // Set initial state - show upload container if no image is selected
  if (!personImageInput.files.length) {
    document
      .getElementById("person-upload-container")
      .classList.remove("hidden");
    personPreviewContainer.classList.add("hidden");
  }

  // Restore saved data from previous session
  await restorePreviousSession();

  // Initialize Google authentication
  await initializeGoogleAuth();

  // Ensure proper initial state - show auth gate by default
  if (!isUserAuthenticated()) {
    updateUserInterface(false);
  }

  // Find the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0]?.id;
    if (!activeTabId) {
      galleryContainer.innerHTML = `
        <div class="gallery-loading">
          <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
          <p class="loading-text">Aucun onglet actif trouvé.</p>
        </div>
      `;
      return;
    }

    // Inject the content script into the active tab
    chrome.scripting
      .executeScript({
        target: { tabId: activeTabId },
        files: ["content.js"],
      })
      .then(() => {
        // After injecting, send a message to it
        chrome.tabs.sendMessage(
          activeTabId,
          { type: "GET_PAGE_IMAGES" },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              // Handle cases where the content script couldn't be injected (e.g., on chrome:// pages)
              galleryContainer.innerHTML = `
                <div class="gallery-loading">
                  <div style="font-size: 2rem; margin-bottom: 1rem;">🚫</div>
                  <p class="loading-text">Impossible d'accéder aux images sur cette page.</p>
                  <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
                    Essayez de naviguer sur un site web normal au lieu des pages système.
                  </p>
                </div>
              `;
            } else {
              renderImageGallery(response.images);
            }
          }
        );
      })
      .catch((err) => {
        console.error("Failed to inject script:", err);
        galleryContainer.innerHTML = `
          <div class="gallery-loading">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
            <p class="loading-text">Impossible d'accéder aux images sur cette page.</p>
            <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
              Veuillez actualiser la page et réessayer.
            </p>
          </div>
        `;
      });
  });
});
