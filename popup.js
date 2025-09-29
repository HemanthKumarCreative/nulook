// popup.js

// --- Global State ---
let selectedClothingUrl = null;
let inFlightController = null;

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

// Backend URL (adjust if needed)
const API_URL = "http://localhost:3000/api/tryon";

// --- Utility ---

function setStatus(msg) {
  statusDiv.textContent = msg;
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
    btnText.textContent = "Generating...";
    btnIcon.textContent = "⏳";
  } else {
    btnLoading.classList.add("hidden");
    btnText.textContent = "Generate Virtual Try-On";
    btnIcon.textContent = "✨";
  }
}

function enableDownload(enable) {
  downloadButton.disabled = !enable;
}

// --- Handlers ---

/**
 * Handles the user selecting a person image file.
 */
function handlePersonImageSelection() {
  const file = personImageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      personPreviewImage.src = e.target.result;
      personPreviewContainer.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  } else {
    personPreviewContainer.classList.add("hidden");
    personPreviewImage.src = "";
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
        <p class="loading-text">No suitable images found on this page.</p>
        <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
          Try browsing a clothing or fashion website for better results.
        </p>
      </div>
    `;
    return;
  }

  // Add a note about potential CORS issues
  const corsNote = document.createElement("div");
  corsNote.className = "cors-note";
  corsNote.innerHTML = `
    <p style="font-size: 12px; color: #666; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
      <strong>Note:</strong> Some images may not display due to website restrictions. 
      You can still select them for virtual try-on.
    </p>
  `;
  galleryContainer.appendChild(corsNote);

  imageUrls.forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.decoding = "async";
    img.title = "Click to select this item";
    img.crossOrigin = "anonymous"; // Try to enable CORS for the image

    // Handle image load errors (including CORS issues)
    img.addEventListener("error", (e) => {
      console.warn(`Failed to load image: ${url}`, e);
      // Add a placeholder or error indicator
      img.style.border = "2px dashed #ff6b6b";
      img.style.opacity = "0.7";
      img.title = "Image may not be accessible due to website restrictions";
    });

    img.addEventListener("load", () => {
      // Remove any error styling if the image loads successfully
      img.style.border = "";
      img.style.opacity = "";
      img.title = "Click to select this item";
    });

    img.addEventListener("click", () => handleImageSelection(url));
    galleryContainer.appendChild(img);
  });
}

/**
 * Handles the user clicking on an image in the gallery.
 * @param {string} url - The URL of the selected image.
 */
function handleImageSelection(url) {
  selectedClothingUrl = url;
  previewImage.src = url;

  // Update UI
  galleryContainer.classList.add("hidden");
  previewContainer.classList.remove("hidden");
  updateGenerateButtonState();
}

/**
 * Handles the user clicking the "Change Selection" button.
 */
function handleRemoveSelection() {
  selectedClothingUrl = null;
  previewImage.src = "";

  // Update UI
  previewContainer.classList.add("hidden");
  galleryContainer.classList.remove("hidden");
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
    setStatus("No image to download.");
    return;
  }

  try {
    const link = document.createElement("a");
    link.href = resultImage.src; // data:image/png;base64,...
    link.download = `virtual-try-on-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatus("💾 Image downloaded successfully! Check your downloads folder.");
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("❌ Download failed. Please try again.");
  }
}

/**
 * Main function to handle form submission.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  if (!personImageInput.files[0] || !selectedClothingUrl) {
    setStatus(
      "📸 Please upload your photo and select a clothing item to continue."
    );
    return;
  }

  // Abort any in-flight request
  if (inFlightController) {
    inFlightController.abort();
  }
  inFlightController = new AbortController();

  setStatus("🎯 Preparing your virtual try-on experience...");
  resultContainer.classList.add("hidden");
  resultImage.src = "";
  enableDownload(false);
  setBusy(true);

  try {
    // Step 1: Fetch the selected website image with CORS handling
    setStatus("📥 Fetching clothing image from website...");
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
    setStatus("💫 Let us do the magic... This may take a moment.");

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      body: formData,
      signal: inFlightController.signal,
    });

    const data = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok || !data) {
      const text = await apiResponse.text().catch(() => "");
      throw new Error(
        `Server error: ${apiResponse.status} ${apiResponse.statusText}${
          text ? " - " + text : ""
        }`
      );
    }

    if (!data.ok) {
      // Standardized backend error
      const msg =
        (data.error && (data.error.message || data.error.code)) ||
        "Failed to generate image.";
      throw new Error(msg);
    }

    // Step 4: Show the image from base64
    const mime = data.output?.image?.mimeType || "image/png";
    const base64 = data.output?.image?.base64;
    if (!base64) {
      throw new Error("No image found in response.");
    }

    const dataURL = `data:${mime};base64,${base64}`;
    resultImage.src = dataURL;
    resultContainer.classList.remove("hidden");
    setStatus("🎉 Amazing! Your virtual try-on is ready!");
    enableDownload(true);
  } catch (error) {
    if (error?.name === "AbortError") {
      setStatus("Request cancelled.");
    } else {
      console.error("Error:", error);

      // Provide more specific error messages for CORS issues
      if (
        error?.message?.includes("CORS") ||
        error?.message?.includes("fetch strategies failed")
      ) {
        setStatus(
          "🚫 Unable to access image due to website restrictions. Try selecting a different image or browse a different website."
        );
      } else if (error?.message?.includes("Failed to fetch")) {
        setStatus(
          "🌐 Network error: Unable to fetch the selected image. Please check your internet connection and try again."
        );
      } else {
        setStatus(
          `❌ ${
            error?.message ||
            "Failed to generate your virtual try-on. Please try again."
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

// --- Event Listeners ---
form.addEventListener("submit", handleFormSubmit);
removeButton.addEventListener("click", handleRemoveSelection);
personImageInput.addEventListener("change", handlePersonImageSelection);
downloadButton.addEventListener("click", handleDownloadImage);

// --- Initialization ---
// When the popup loads, ask the content script for images
document.addEventListener("DOMContentLoaded", () => {
  updateGenerateButtonState(); // Initial state
  enableDownload(false);

  // Find the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0]?.id;
    if (!activeTabId) {
      galleryContainer.innerHTML = `
        <div class="gallery-loading">
          <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
          <p class="loading-text">No active tab found.</p>
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
                  <p class="loading-text">Cannot access images on this page.</p>
                  <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
                    Try browsing a regular website instead of system pages.
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
            <p class="loading-text">Cannot access images on this page.</p>
            <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
              Please refresh the page and try again.
            </p>
          </div>
        `;
      });
  });
});
