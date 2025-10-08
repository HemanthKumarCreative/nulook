// fullscreen.js - Fullscreen version of NUSENSE TryON

// Import all functionality from popup.js
// This file extends the popup functionality for fullscreen mode

// --- Global State ---
let selectedClothingUrl = null;
let inFlightController = null;

// --- Storage Keys ---
const STORAGE_KEYS = {
  UPLOADED_IMAGE: "nusense_tryon_uploaded_image",
  GENERATED_IMAGE: "nusense_tryon_generated_image",
  SELECTED_CLOTHING_URL: "nusense_tryon_selected_clothing_url",
  LAST_SESSION_DATA: "nusense_tryon_last_session",
};

// --- DOM Elements ---
const form = document.getElementById("tryon-form");
const personImageInput = document.getElementById("person-image");
const personPreviewContainer = document.getElementById(
  "person-preview-container"
);
const personPreviewImage = document.getElementById("person-preview-image");
const galleryContainer = document.getElementById("website-images-container");
const previewContainer = document.getElementById("clothing-preview-container");
const previewImage = document.getElementById("clothing-preview-image");
const removeButton = document.getElementById("remove-selection-btn");
const generateButton = document.getElementById("generate-btn");
const statusDiv = document.getElementById("status");
const resultContainer = document.getElementById("result-container");
const resultImage = document.getElementById("result-image");
const downloadButton = document.getElementById("download-btn");
const buyNowButton = document.getElementById("buy-now-btn");
const addToCartButton = document.getElementById("add-to-cart-btn");
const tryInStoreButton = document.getElementById("try-in-store-btn");
const minimizeButton = document.getElementById("minimize-btn");

// Backend URL (adjust if needed)
const API_URL = "http://localhost:3000/api/tryon";

// --- Utility ---

function setStatus(msg) {
  statusDiv.textContent = msg;
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

function setBusy(isBusy) {
  generateButton.disabled = isBusy || generateButton.disabled;
  form.classList.toggle("busy", isBusy);

  // Update button loading state
  const btnLoading = generateButton.querySelector(".btn-loading");
  const btnText = generateButton.querySelector(".btn-text");
  const btnIcon = generateButton.querySelector(".btn-icon");

  if (isBusy) {
    btnLoading.classList.remove("hidden");
    btnText.textContent = "Génération...";
    btnIcon.textContent = "⏱️";
  } else {
    btnLoading.classList.add("hidden");
    btnText.textContent = "Générer l'Essayage Virtuel";
    btnIcon.textContent = "⚡";
  }
}

function enableDownload(enable) {
  downloadButton.disabled = !enable;
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

      // Save the uploaded image to storage
      await saveUploadedImage(file);
    };
    reader.readAsDataURL(file);
  } else {
    personPreviewContainer.classList.add("hidden");
    personPreviewImage.src = "";

    // Clear the uploaded image from storage
    await clearStorageKey(STORAGE_KEYS.UPLOADED_IMAGE);
  }
  updateGenerateButtonState();
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

  // Add a note about potential CORS issues
  const corsNote = document.createElement("div");
  corsNote.className = "cors-note";
  corsNote.innerHTML = `
    <p style="font-size: 12px; color: #666; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 0.25rem;">
      <strong>Note :</strong> Certaines images peuvent ne pas s'afficher en raison des restrictions du site web.
      Vous pouvez toujours les sélectionner pour l'essayage virtuel.
    </p>
  `;
  galleryContainer.appendChild(corsNote);

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
      // Add a placeholder or error indicator
      img.style.border = "2px dashed #ff6b6b";
      img.style.opacity = "0.7";
      img.title =
        "L'image peut ne pas être accessible en raison des restrictions du site web";
    });

    img.addEventListener("load", () => {
      // Remove any error styling if the image loads successfully
      img.style.border = "";
      img.style.opacity = "";
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

  updateGenerateButtonState();
}

/**
 * Handles the user clicking the "Change Selection" button.
 */
async function handleRemoveSelection() {
  selectedClothingUrl = null;
  previewImage.src = "";

  // Update UI
  previewContainer.classList.add("hidden");
  galleryContainer.classList.remove("hidden");

  // Clear the selected clothing URL from storage
  await clearStorageKey(STORAGE_KEYS.SELECTED_CLOTHING_URL);

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
}

/**
 * Handles downloading the generated image (PNG).
 */
function handleDownloadImage() {
  if (!resultImage.src) {
    setStatus("Aucune image à télécharger.");
    return;
  }

  try {
    const link = document.createElement("a");
    link.href = resultImage.src; // data:image/png;base64,...
    link.download = `nusense-virtual-try-on-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatus(
      "💾 Image téléchargée avec succès ! Vérifiez votre dossier de téléchargements."
    );
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("❌ Échec du téléchargement. Veuillez réessayer.");
  }
}

/**
 * Handles the Buy Now button click
 */
function handleBuyNow() {
  if (!selectedClothingUrl) {
    setStatus("📸 Veuillez d'abord sélectionner un article de vêtement.");
    return;
  }

  // In a real application, this would redirect to the product page or checkout
  setStatus("🛒 Redirection vers la page d'achat...");

  // Simulate opening the product page in a new tab
  setTimeout(() => {
    setStatus("🎉 Redirection vers la page d'achat réussie !");
    // In a real implementation, you would:
    // window.open(selectedClothingUrl, '_blank');
    // or redirect to a checkout page
  }, 1000);
}

/**
 * Handles the Add to Cart button click
 */
function handleAddToCart() {
  if (!selectedClothingUrl) {
    setStatus("📸 Veuillez d'abord sélectionner un article de vêtement.");
    return;
  }

  setStatus("➕ Article ajouté au panier avec succès !");

  // In a real application, this would add the item to a shopping cart
  // You could store cart items in Chrome storage or send to a backend
  setTimeout(() => {
    setStatus("🛒 L'article a été ajouté à votre panier.");
  }, 1500);
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
 * Handles minimizing the fullscreen view
 */
function handleMinimize() {
  // In a real implementation, this would switch back to popup mode
  setStatus("🔄 Passage à la vue popup...");

  setTimeout(() => {
    // This would typically close the fullscreen window and open the popup
    // For now, we'll just show a message
    setStatus("📱 Passage à la vue popup réussi !");
  }, 500);
}

/**
 * Main function to handle form submission.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

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
    const clothingBlob = await fetchImageWithCorsHandling(
      selectedClothingUrl,
      inFlightController.signal
    );

    // Step 2: Create FormData and append both images
    const formData = new FormData();
    formData.append("personImage", personImageInput.files[0]);
    // Give the blob a filename so the server's 'multer' can process it
    formData.append("itemImage", clothingBlob, "clothing-item.jpg");

    // Step 3: Send to the backend (expects JSON response)
    setStatus("💫 Laissez-nous faire la magie... Cela peut prendre un moment.");

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      body: formData,
      signal: inFlightController.signal,
    });

    const data = await apiResponse.json().catch(() => null);

    // Check for error status first (even if HTTP status is not ok)
    if (data && data.status === "error") {
      // For fullscreen mode, show user-friendly error message
      let errorMsg =
        data.error_message?.message || "Échec de la génération de l'image.";

      // Provide more user-friendly messages for specific error codes
      const errorCode = data.error_message?.code;
      if (errorCode === "MODEL_TIMEOUT") {
        errorMsg =
          "La génération prend plus de temps que prévu. Veuillez réessayer avec des images plus simples ou une meilleure connexion internet.";
      } else if (errorCode === "MISSING_FILES_ERROR") {
        errorMsg =
          "Veuillez vous assurer que vous avez sélectionné à la fois votre photo et un article de vêtement.";
      } else if (errorCode === "SERVER_ERROR") {
        errorMsg =
          "Une erreur technique s'est produite. Veuillez réessayer dans quelques instants.";
      }

      setStatus(`❌ ${errorMsg}`);

      // Add error animation to generate button
      generateButton.classList.add("button-error");
      setTimeout(() => {
        generateButton.classList.remove("button-error");
      }, 500);

      return; // Don't throw error, just show the error message
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
      // The image is already a data URL from the backend
      resultImage.src = data.image;
      resultContainer.classList.remove("hidden");

      // Save the generated image to storage
      await saveGeneratedImage(data.image);

      setStatus("🎉 Incroyable ! Votre essayage virtuel est prêt !");
      enableDownload(true);
    } else if (data.status === "success" && !data.image) {
      throw new Error("Aucune image générée dans la réponse de succès.");
    } else {
      throw new Error("Réponse invalide du serveur.");
    }
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
removeButton.addEventListener("click", handleRemoveSelection);
personImageInput.addEventListener("change", handlePersonImageSelection);
downloadButton.addEventListener("click", handleDownloadImage);
buyNowButton.addEventListener("click", handleBuyNow);
addToCartButton.addEventListener("click", handleAddToCart);
tryInStoreButton?.addEventListener("click", handleTryInStore);
minimizeButton.addEventListener("click", handleMinimize);

// --- Initialization ---
// When the fullscreen page loads, ask the content script for images
document.addEventListener("DOMContentLoaded", async () => {
  // Set current year dynamically
  const currentYearElement = document.getElementById("current-year");
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  updateGenerateButtonState(); // Initial state
  enableDownload(false);

  // Restore saved data from previous session
  await restorePreviousSession();

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
