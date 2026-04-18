const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

const modes = {
  couple: {
    collections: ["sleep", "travel", "wfh", "gym"]
  },
  single: {
    collections: ["mom", "dad", "bff", "kids"]
  }
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/products", async (req, res) => {
  try {
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
      return res.status(500).json({
        error: "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN in .env"
      });
    }

    const modeKey = req.query.mode === "single" ? "single" : "couple";
    const requestedTab = String(req.query.collection || "").toLowerCase().trim();

    const allowedCollections = modes[modeKey].collections;
    const activeCollection = allowedCollections.includes(requestedTab)
      ? requestedTab
      : allowedCollections[0];

    const query = `
      query GetCollectionProducts($handle: String!) {
        collectionByHandle(handle: $handle) {
          id
          title
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
                      price
                      compareAtPrice
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
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN
        },
        body: JSON.stringify({
          query,
          variables: { handle: activeCollection }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: "Shopify request failed",
        details: errorText
      });
    }

    const payload = await response.json();

    if (payload.errors) {
      return res.status(500).json({
        error: payload.errors[0]?.message || "Shopify API error",
        details: payload.errors
      });
    }

    const collection = payload?.data?.collectionByHandle;

    if (!collection) {
      return res.json({
        mode: modeKey,
        collection: activeCollection,
        products: []
      });
    }

    const productEdges = collection.products?.edges || [];

    const products = productEdges.map(({ node: product }) => {
      const variant = product.variants?.edges?.[0]?.node || {};
      const sale = Number(variant?.price || 0);
      const compare = Number(variant?.compareAtPrice || sale);
      const discount =
        compare > sale && compare > 0
          ? Math.round(((compare - sale) / compare) * 100)
          : 0;

      return {
        id: product.id,
        title: product.title,
        subtitle: deriveSubtitle(product.title),
        tags: product.tags || [],
        image: product.featuredImage?.url || "",
        altText: product.featuredImage?.altText || product.title,
        originalPrice: formatMoney(compare || sale, "INR"),
        salePrice: formatMoney(sale, "INR"),
        originalPriceValue: compare || sale,
        salePriceValue: sale,
        discount,
        variantId: variant?.id || "",
        productUrl: product.onlineStoreUrl || `https://${SHOPIFY_STORE_DOMAIN}`
      };
    });

    return res.json({
      mode: modeKey,
      collection: activeCollection,
      products
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unexpected server error"
    });
  }
});

function deriveSubtitle(title) {
  const text = String(title || "").toLowerCase();

  if (text.includes("sleep")) return "Better Rest & Relaxation";
  if (text.includes("travel")) return "Comfort On The Go";
  if (text.includes("wfh")) return "Workday Comfort Essential";
  if (text.includes("gym")) return "Recovery & Fitness Comfort";
  if (text.includes("mom")) return "Thoughtful Comfort For Mom";
  if (text.includes("dad")) return "Everyday Comfort For Dad";
  if (text.includes("bff")) return "Gift Your Best Friend Comfort";
  if (text.includes("kids")) return "Soft Comfort For Kids";

  return "Daily Comfort Essential";
}

function formatMoney(value, currency = "INR") {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});