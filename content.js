// content.js
// Collect likely product/image URLs from the page, including <img>, <picture/srcset> and CSS backgrounds.

(function () {
  // Convert possibly relative URLs to absolute
  function toAbsolute(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return null;
    }
  }

  function unique(arr) {
    return Array.from(new Set(arr)).filter(Boolean);
  }

  // Parse srcset attribute into URLs
  function parseSrcset(srcset) {
    if (!srcset) return [];
    return srcset
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .map(toAbsolute)
      .filter(Boolean);
  }

  // Collect from <img>, <source> (inside <picture>), and their srcset/currentSrc
  function collectFromImages() {
    const urls = [];

    // <img> - collect all images
    document.querySelectorAll("img").forEach((img) => {
      // Skip very small images (likely icons/sprites)
      if (img.width < 50 && img.height < 50) return;

      // Prefer currentSrc if available, then src
      const primary = img.currentSrc || img.src;
      if (primary) urls.push(primary);

      // Consider srcset candidates
      const srcsetUrls = parseSrcset(img.srcset);
      urls.push(...srcsetUrls);
    });

    // <source> in <picture> (type image/*)
    document.querySelectorAll("picture > source").forEach((source) => {
      if (source.type && !source.type.startsWith("image/")) return;
      const srcsetUrls = parseSrcset(source.srcset);
      urls.push(...srcsetUrls);
    });

    // <video> poster images
    document.querySelectorAll("video[poster]").forEach((video) => {
      const poster = video.getAttribute("poster");
      if (poster) urls.push(poster);
    });

    return urls;
  }

  // Collect from CSS background-image
  function collectFromBackgrounds() {
    const urls = [];
    const elements = document.querySelectorAll("*");
    elements.forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return;

      // Could be multiple URLs: url("..."), url('...'), url(...)
      const matches = bg.match(/url\((['"]?)(.*?)\1\)/g);
      if (matches) {
        matches.forEach((m) => {
          const inner = m
            .replace(/^url\((['"]?)/, "")
            .replace(/(['"]?)\)$/, "");
          const abs = toAbsolute(inner);
          if (abs) urls.push(abs);
        });
      }
    });
    return urls;
  }

  // Collect common meta image (e.g., og:image)
  function collectFromMeta() {
    const urls = [];
    const og = document.querySelector(
      'meta[property="og:image"], meta[name="og:image"]'
    );
    if (og?.content) {
      const abs = toAbsolute(og.content);
      if (abs) urls.push(abs);
    }
    const twitter = document.querySelector(
      'meta[name="twitter:image"], meta[property="twitter:image"]'
    );
    if (twitter?.content) {
      const abs = toAbsolute(twitter.content);
      if (abs) urls.push(abs);
    }
    return urls;
  }

  // Collect image-like URLs from <a href> that look like images
  function collectFromLinks() {
    const urls = [];
    document
      .querySelectorAll(
        'a[href*=".png"], a[href*=".jpg"], a[href*=".jpeg"], a[href*=".webp"], a[href*=".gif"], a[href*=".svg"]'
      )
      .forEach((a) => {
        const abs = toAbsolute(a.getAttribute("href"));
        if (abs) urls.push(abs);
      });
    return urls;
  }

  // Collect from data attributes that might contain image URLs
  function collectFromDataAttributes() {
    const urls = [];
    document
      .querySelectorAll("[data-src], [data-image], [data-img], [data-url]")
      .forEach((el) => {
        const src =
          el.getAttribute("data-src") ||
          el.getAttribute("data-image") ||
          el.getAttribute("data-img") ||
          el.getAttribute("data-url");
        if (src) {
          const abs = toAbsolute(src);
          if (abs) urls.push(abs);
        }
      });
    return urls;
  }

  function filterCandidates(urls) {
    // More inclusive filtering to capture all possible images
    const out = urls
      .filter((u) => !!u)
      .filter((u) => !u.startsWith("data:")) // prefer fetchable URLs
      .filter((u) => {
        // Accept images with common extensions or no extension (API endpoints)
        return (
          /\.(png|jpe?g|webp|gif|svg|bmp|tiff?)(\?|#|$)/i.test(u) ||
          /\/images?\//i.test(u) ||
          /\/media\//i.test(u) ||
          /\/assets?\//i.test(u) ||
          /\/uploads?\//i.test(u)
        );
      });

    // Prioritize larger images and product images
    const score = (u) => {
      let s = 0;
      // High resolution indicators
      if (/(\b|\D)(1080|1200|1440|1600|1920|2048|2560)(\b|\D)/.test(u)) s += 4;
      // Product/clothing related keywords
      if (
        /(product|item|clothing|apparel|fashion|garment|dress|shirt|pants|shoes)/i.test(
          u
        )
      )
        s += 3;
      // Size indicators
      if (/(large|xlarge|xl|xxl|hero|detail|full|original)/i.test(u)) s += 2;
      // Quality indicators
      if (/(hd|high|quality|premium)/i.test(u)) s += 2;
      // Penalize small/icon images
      if (/(thumb|small|tiny|icon|sprite|avatar|profile)/i.test(u)) s -= 1;
      return s;
    };

    return unique(out)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 150); // Increased limit to show more images
  }

  function collectImageUrls() {
    const urls = [
      ...collectFromImages(),
      ...collectFromBackgrounds(),
      ...collectFromMeta(),
      ...collectFromLinks(),
      ...collectFromDataAttributes(),
    ];
    return filterCandidates(urls);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GET_PAGE_IMAGES") {
      try {
        const images = collectImageUrls();
        sendResponse({ images });
      } catch (e) {
        sendResponse({ images: [] });
      }
      // By returning true we indicate we might respond asynchronously,
      // but here we respond synchronously so it's fine to omit.
    }
  });
})();
