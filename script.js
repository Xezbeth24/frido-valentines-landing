const STORE_DOMAIN = "frido-assignment-aftab.myshopify.com";

const DESIGN_ASSETS = {
  icons: {
    iconMenu: "assets/icons/menu.svg",
    iconAccount: "assets/icons/account.svg",
    iconSearch: "assets/icons/search.svg",
    iconCart: "assets/icons/cart.svg"
  },
  illustrations: {
    couple: "assets/illustrations/couple.svg",
    single: "assets/illustrations/single.svg"
  }
};

const CATEGORY_AVATARS = {
  sleep: "S",
  travel: "T",
  wfh: "W",
  gym: "G",
  mom: "M",
  dad: "D",
  bff: "B",
  kids: "K"
};

// Tabs now match assignment categories.
// Collections are handled on the backend via the `collection` query param.
const modes = {
  couple: {
    key: "couple",
    label: "Couple Mode",
    title: "This Valentine's\nGift Comfort",
    subtitle: "& get up to 70% OFF",
    heading: "So... what kind of Paglu is yours?",
    video: "https://cdn.shopify.com/videos/c/o/v/c102dc6ee2be49fc9935403b43e413bb.mp4",
    tabs: ["Sleep", "Travel", "WFH", "GYM"],
    secondaryTabs: ["Sleep", "Travel", "WFH", "GYM"],
    showSecondary: false,
    storyTitle: "Match Made in Comfort",
    bodyClass: "couple-mode"
  },
  single: {
    key: "single",
    label: "Single Mode",
    title: "THIS VALENTINE'S\nBE YOUR OWN BAE",
    subtitle: "& get up to 70% OFF",
    heading: "Pick where you need pampering",
    video: "https://cdn.shopify.com/videos/c/o/v/452bedba47694a96a7e5684c79a0eeb3.mp4",
    tabs: ["Sleep", "Travel", "WFH", "GYM"],
    secondaryTabs: ["Mom", "Dad", "BFF", "Kids"],
    showSecondary: true,
    storyTitle: "Or... pamper who matters to you!",
    bodyClass: "single-mode"
  }
};

let currentMode = "couple";
let activeCategory = "Sleep";
let activeSecondaryCategory = "Sleep";

// Cache products per (mode, category) so toggling tabs is snappy
// Structure: cache[modeKey][categoryKey] = [products]
let modeProductsCache = {
  couple: {},
  single: {}
};

const body = document.body;
const modeToggle = document.getElementById("modeToggle");
const modeBadge = document.getElementById("modeBadge");
const hero = document.getElementById("hero");
const heroTitle = document.getElementById("heroTitle");
const heroSubtitle = document.getElementById("heroSubtitle");
const heroVideo = document.getElementById("heroVideo");
const filterHeading = document.getElementById("filterHeading");
const tabsContainer = document.getElementById("tabs");
const productsGrid = document.getElementById("productsGrid");
const midStory = document.getElementById("midStory");
const storyTitle = document.getElementById("storyTitle");
const secondaryFiltersWrap = document.getElementById("secondaryFiltersWrap");
const secondaryTabs = document.getElementById("secondaryTabs");
const secondaryProductsSection = document.getElementById("secondaryProductsSection");
const secondaryProductsGrid = document.getElementById("secondaryProductsGrid");
const storyImage = document.getElementById("storyImage");
const tabTemplate = document.getElementById("tabTemplate");
const productTemplate = document.getElementById("productTemplate");
let isModeSwitching = false;

function init() {
  hydrateDesignAssets();
  modeToggle.addEventListener("click", onToggleMode);
  applyMode("couple");
}

function onToggleMode() {
  if (isModeSwitching) return;
  const nextMode = currentMode === "couple" ? "single" : "couple";
  playModeTransition(nextMode);
}

async function playModeTransition(nextMode) {
  isModeSwitching = true;

  body.classList.add("mode-transition");
  hero.classList.remove("mode-transition-run");
  void hero.offsetWidth;
  hero.classList.add("mode-transition-run");

  await delay(120);
  await applyMode(nextMode);
  await delay(520);

  hero.classList.remove("mode-transition-run");
  body.classList.remove("mode-transition");
  isModeSwitching = false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyMode(modeKey) {
  const mode = modes[modeKey];

  currentMode = modeKey;
  activeCategory = mode.tabs[0];
  activeSecondaryCategory = mode.secondaryTabs[0];

  body.classList.remove("couple-mode", "single-mode");
  body.classList.add(mode.bodyClass);

  modeBadge.textContent = mode.label;
  heroTitle.textContent = mode.title;
  heroSubtitle.textContent = mode.subtitle;
  filterHeading.textContent = mode.heading;

  const source = heroVideo.querySelector("source");
  if (!source || source.src !== mode.video) {
    heroVideo.innerHTML = `<source src="${mode.video}" type="video/mp4">`;
    heroVideo.load();
  }

  renderTabs(mode.tabs, tabsContainer, false);
  renderTabs(mode.secondaryTabs, secondaryTabs, true);
  configureStoryAndSecondary(mode);

  renderLoadingCards(productsGrid);
  if (mode.showSecondary) renderLoadingCards(secondaryProductsGrid);

  await loadProductsForActiveCategories();
}

function configureStoryAndSecondary(mode) {
  storyTitle.textContent = mode.storyTitle;
  midStory.setAttribute("aria-hidden", "false");

  const imagePath = DESIGN_ASSETS.illustrations[mode.key];
  if (imagePath) {
    storyImage.src = imagePath;
    storyImage.hidden = false;
  } else {
    storyImage.hidden = true;
  }

  secondaryFiltersWrap.hidden = !mode.showSecondary;
  secondaryProductsSection.hidden = !mode.showSecondary;
}

function hydrateDesignAssets() {
  Object.entries(DESIGN_ASSETS.icons).forEach(([buttonId, src]) => {
    const button = document.getElementById(buttonId);
    if (!button || !src) return;

    const iconImg = new Image();
    iconImg.src = src;
    iconImg.alt = "";
    iconImg.setAttribute("aria-hidden", "true");

    iconImg.addEventListener("load", () => {
      button.textContent = "";
      button.appendChild(iconImg);
    });
  });
}

function renderTabs(categories, container, isSecondary) {
  container.innerHTML = "";

  categories.forEach((category) => {
    const fragment = tabTemplate.content.cloneNode(true);
    const tabButton = fragment.querySelector(".tab");
    const avatar = fragment.querySelector(".tab-avatar");
    const text = fragment.querySelector(".tab-text");
    const normalized = category.toLowerCase();

    text.textContent = category;
    avatar.textContent =
      CATEGORY_AVATARS[normalized] || category.charAt(0).toUpperCase();
    avatar.dataset.category = normalized;

    const isActive =
      isSecondary ? category === activeSecondaryCategory : category === activeCategory;
    tabButton.setAttribute("aria-selected", String(isActive));

    tabButton.addEventListener("click", async () => {
      if (isSecondary) {
        activeSecondaryCategory = category;
        updateActiveTabUI(secondaryTabs, true);
      } else {
        activeCategory = category;
        updateActiveTabUI(tabsContainer, false);
      }
      await loadProductsForActiveCategories();
    });

    container.appendChild(fragment);
  });
}

function updateActiveTabUI(container, isSecondary) {
  const tabButtons = container.querySelectorAll(".tab");
  tabButtons.forEach((button) => {
    const label = button.querySelector(".tab-text").textContent;
    const selected =
      isSecondary ? label === activeSecondaryCategory : label === activeCategory;
    button.setAttribute("aria-selected", String(selected));
  });
}

function renderLoadingCards(container) {
  container.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    const card = document.createElement("article");
    card.className = "product-card loading";
    container.appendChild(card);
  }
}

function renderStateCard(message, container) {
  container.innerHTML = "";
  const stateCard = document.createElement("article");
  stateCard.className = "state-card";
  stateCard.textContent = message;
  container.appendChild(stateCard);
}

// Load products for primary and secondary active categories via backend
async function loadProductsForActiveCategories() {
  const modeKey = currentMode;
  const primaryKey = activeCategory.toLowerCase();
  const secondaryKey = activeSecondaryCategory.toLowerCase();

  // Primary
  if (!modeProductsCache[modeKey][primaryKey]) {
    renderLoadingCards(productsGrid);
    try {
      const products = await fetchModeProducts(modeKey, primaryKey);
      modeProductsCache[modeKey][primaryKey] = products;
    } catch (err) {
      console.error(err);
      renderStateCard("Unable to fetch products right now.", productsGrid);
      return;
    }
  }

  const primaryProducts = modeProductsCache[modeKey][primaryKey];
  if (!primaryProducts.length) {
    renderStateCard(`No products found for ${activeCategory}.`, productsGrid);
  } else {
    productsGrid.innerHTML = "";
    primaryProducts.forEach((product, index) => {
      productsGrid.appendChild(createProductCard(product, index));
    });
  }

  // Secondary (only for single mode)
  if (modes[modeKey].showSecondary) {
    if (!modeProductsCache[modeKey][secondaryKey]) {
      renderLoadingCards(secondaryProductsGrid);
      try {
        const products = await fetchModeProducts(modeKey, secondaryKey);
        modeProductsCache[modeKey][secondaryKey] = products;
      } catch (err) {
        console.error(err);
        renderStateCard("Unable to fetch products right now.", secondaryProductsGrid);
        return;
      }
    }

    const secondaryProducts = modeProductsCache[modeKey][secondaryKey];
    if (!secondaryProducts.length) {
      renderStateCard(
        `No products found for ${activeSecondaryCategory}.`,
        secondaryProductsGrid
      );
    } else {
      secondaryProductsGrid.innerHTML = "";
      secondaryProducts.forEach((product, index) => {
        secondaryProductsGrid.appendChild(createProductCard(product, index));
      });
    }
  }
}

function createProductCard(product, index) {
  const fragment = productTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const image = fragment.querySelector(".product-image");
  const title = fragment.querySelector(".product-title");
  const subtitle = fragment.querySelector(".product-subtitle");
  const originalPrice = fragment.querySelector(".original-price");
  const discountBadge = fragment.querySelector(".discount-badge");
  const salePrice = fragment.querySelector(".sale-price");
  const addToCartButton = fragment.querySelector(".add-to-cart");

  card.style.animationDelay = `${Math.min(index * 60, 420)}ms`;

  image.src = product.image || "https://placehold.co/400x400?text=Frido";
  image.alt = product.title;

  title.textContent = product.title;
  subtitle.textContent = product.subtitle || deriveSubtitle(product.title);
  originalPrice.textContent = product.originalPrice;
  discountBadge.textContent = product.discount ? `${product.discount}% OFF` : "";
  salePrice.textContent = product.salePrice;

  addToCartButton.addEventListener("click", () => {
    const addUrl = product.variantId
      ? `https://${STORE_DOMAIN}/cart/${decodeShopifyId(product.variantId)}:1`
      : product.productUrl;
    window.open(addUrl, "_blank", "noopener,noreferrer");
  });

  return fragment;
}

// Call backend: /api/products?mode=couple&collection=sleep
async function fetchModeProducts(modeKey, categoryKey) {
  const url = `/api/products?mode=${encodeURIComponent(
    modeKey
  )}&collection=${encodeURIComponent(categoryKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Shopify API request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }

  return Array.isArray(payload.products) ? payload.products : [];
}

function deriveSubtitle(title) {
  const text = String(title || "").toLowerCase();
  if (text.includes("heel") || text.includes("foot")) {
    return "Relief From Heel Pain";
  }
  if (text.includes("back") || text.includes("lumbar")) {
    return "Relief For Back Comfort";
  }
  if (text.includes("neck") || text.includes("cervical")) {
    return "Posture Friendly Comfort";
  }
  return "Daily Comfort Essential";
}

function money(value, currency) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);
}

function decodeShopifyId(encodedId) {
  try {
    const decoded = atob(encodedId);
    return decoded.split("/").pop();
  } catch {
    return encodedId;
  }
}

init();