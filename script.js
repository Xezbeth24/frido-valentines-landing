const SHOPIFY_CONFIG = {
  domain: "YOUR_STORE.myshopify.com",
  storefrontToken: "YOUR_STOREFRONT_API_TOKEN",
  apiVersion: "2025-01"
};

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
    collections: ["all", "best-sellers", "featured"],
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
    collections: ["all", "new-arrivals", "featured"],
    bodyClass: "single-mode"
  }
};

let currentMode = "couple";
let activeCategory = "Sleep";
let activeSecondaryCategory = "Sleep";
let modeProductsCache = {
  couple: [],
  single: []
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
  if (isModeSwitching) {
    return;
  }

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
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

  if (heroVideo.querySelector("source").src !== mode.video) {
    heroVideo.querySelector("source").src = mode.video;
    heroVideo.load();
  }

  renderTabs(mode.tabs, tabsContainer, false);
  renderTabs(mode.secondaryTabs, secondaryTabs, true);
  configureStoryAndSecondary(mode);

  renderLoadingCards(productsGrid);
  if (mode.showSecondary) {
    renderLoadingCards(secondaryProductsGrid);
  }

  if (modeProductsCache[modeKey].length === 0) {
    try {
      modeProductsCache[modeKey] = await fetchModeProducts(mode);
    } catch {
      renderStateCard(
        "Unable to fetch products right now. Add your Shopify store domain and Storefront token in script.js and refresh.",
        productsGrid
      );
      if (mode.showSecondary) {
        renderStateCard("Waiting for Shopify products...", secondaryProductsGrid);
      }
      return;
    }
  }

  renderProducts();
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
    if (!button || !src) {
      return;
    }

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
    avatar.textContent = CATEGORY_AVATARS[normalized] || category.charAt(0).toUpperCase();
    avatar.dataset.category = normalized;

    const isActive = isSecondary ? category === activeSecondaryCategory : category === activeCategory;
    tabButton.setAttribute("aria-selected", String(isActive));

    tabButton.addEventListener("click", () => {
      if (isSecondary) {
        activeSecondaryCategory = category;
        updateActiveTabUI(secondaryTabs, true);
      } else {
        activeCategory = category;
        updateActiveTabUI(tabsContainer, false);
      }
      renderProducts();
    });

    container.appendChild(fragment);
  });
}

function updateActiveTabUI(container, isSecondary) {
  const tabButtons = container.querySelectorAll(".tab");
  tabButtons.forEach((button) => {
    const label = button.querySelector(".tab-text").textContent;
    const selected = isSecondary ? label === activeSecondaryCategory : label === activeCategory;
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

function renderProducts() {
  const sourceProducts = modeProductsCache[currentMode];
  const filtered = filterProductsByCategory(sourceProducts, activeCategory);

  if (filtered.length === 0) {
    renderStateCard(`No products found for ${activeCategory}.`, productsGrid);
  } else {
    productsGrid.innerHTML = "";
    filtered.forEach((product, index) => {
      productsGrid.appendChild(createProductCard(product, index));
    });
  }

  if (modes[currentMode].showSecondary) {
    const secondaryFiltered = filterProductsByCategory(sourceProducts, activeSecondaryCategory);
    if (secondaryFiltered.length === 0) {
      renderStateCard(`No products found for ${activeSecondaryCategory}.`, secondaryProductsGrid);
    } else {
      secondaryProductsGrid.innerHTML = "";
      secondaryFiltered.forEach((product, index) => {
        secondaryProductsGrid.appendChild(createProductCard(product, index));
      });
    }
  }
}

function filterProductsByCategory(sourceProducts, category) {
  const categoryKey = category.toLowerCase();
  return sourceProducts.filter((product) => {
    if (!Array.isArray(product.tags) || product.tags.length === 0) {
      return true;
    }
    return product.tags.some((tag) => tag.toLowerCase() === categoryKey);
  });
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
  subtitle.textContent = product.subtitle;
  originalPrice.textContent = product.originalPrice;
  discountBadge.textContent = `${product.discount}% OFF`;
  salePrice.textContent = product.salePrice;

  addToCartButton.addEventListener("click", () => {
    const addUrl = product.variantId
      ? `https://${SHOPIFY_CONFIG.domain}/cart/${decodeShopifyId(product.variantId)}:1`
      : product.productUrl;
    window.open(addUrl, "_blank", "noopener,noreferrer");
  });

  return fragment;
}

async function fetchModeProducts(mode) {
  ensureShopifyConfig();

  const collectionQuery = mode.collections.map((handle) => `handle:${handle}`).join(" OR ");

  const query = `
    query ProductsByCollection($query: String!) {
      collections(first: 8, query: $query) {
        edges {
          node {
            handle
            products(first: 30) {
              edges {
                node {
                  id
                  title
                  tags
                  onlineStoreUrl
                  featuredImage {
                    url
                    altText
                  }
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        price {
                          amount
                          currencyCode
                        }
                        compareAtPrice {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(
    `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_CONFIG.storefrontToken
      },
      body: JSON.stringify({
        query,
        variables: { query: collectionQuery }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(payload.errors[0]?.message || "Shopify API error");
  }

  const collectionEdges = payload.data.collections.edges || [];
  const productMap = new Map();

  collectionEdges.forEach((collectionEdge) => {
    const productEdges = collectionEdge.node.products.edges || [];
    productEdges.forEach((productEdge) => {
      const normalized = normalizeProduct(productEdge.node);
      productMap.set(normalized.id, normalized);
    });
  });

  return Array.from(productMap.values());
}

function normalizeProduct(product) {
  const variant = product.variants?.edges?.[0]?.node;
  const sale = Number(variant?.price?.amount || 0);
  const compare = Number(variant?.compareAtPrice?.amount || sale);
  const discount = compare > sale && compare > 0 ? Math.round(((compare - sale) / compare) * 100) : 0;
  const currency = variant?.price?.currencyCode || "INR";

  return {
    id: product.id,
    title: product.title,
    subtitle: deriveSubtitle(product.title),
    tags: product.tags || [],
    image: product.featuredImage?.url || "",
    originalPrice: compare ? money(compare, currency) : money(sale, currency),
    salePrice: money(sale, currency),
    discount,
    variantId: variant?.id,
    productUrl: product.onlineStoreUrl || `https://${SHOPIFY_CONFIG.domain}`
  };
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

function ensureShopifyConfig() {
  if (
    !SHOPIFY_CONFIG.domain ||
    SHOPIFY_CONFIG.domain.includes("YOUR_STORE") ||
    !SHOPIFY_CONFIG.storefrontToken ||
    SHOPIFY_CONFIG.storefrontToken.includes("YOUR_STOREFRONT_API_TOKEN")
  ) {
    throw new Error("Shopify config missing");
  }
}

init();
