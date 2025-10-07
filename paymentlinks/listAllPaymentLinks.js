import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

async function listAllPaymentLinks() {
  console.log("📦 Lade alle Payment Links aus Stripe...");

  let allLinks = [];
  let hasMore = true;
  let lastId = null;

  while (hasMore) {
    const response = await stripe.paymentLinks.list({
      limit: 100,
      starting_after: lastId || undefined,
    });

    allLinks.push(...response.data);
    hasMore = response.has_more;
    if (hasMore) lastId = response.data[response.data.length - 1].id;
  }

  console.log(`✅ ${allLinks.length} Payment Links gefunden.`);

  const results = [];

  for (const link of allLinks) {
    const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
    const item = lineItems.data[0];
    const price = item ? await stripe.prices.retrieve(item.price.id) : null;
    const product = price ? await stripe.products.retrieve(price.product) : null;

    results.push({
      id: link.id,
      product: product?.name || "Unbekannt",
      price_eur: price ? (price.unit_amount / 100).toFixed(2) : "-",
      lookup_key: price?.lookup_key || "-",
      url: link.url,
      active: link.active,
      created: link.created ? new Date(link.created * 1000).toISOString() : "unbekannt",
      allow_promo: link.allow_promotion_codes ? "Ja" : "Nein",
      discount: link.metadata?.discount || "-",
      duplicated_from: link.metadata?.duplicated_from || "-",
    });
  }

  // 🔹 Speichern
  const dir = "./backups";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join(dir, `paymentlinks_full_${timestamp}.csv`);
  const jsonPath = path.join(dir, `paymentlinks_full_${timestamp}.json`);

  const csv = [
    "id,product,price_eur,lookup_key,url,active,created,allow_promo,discount,duplicated_from",
    ...results.map(r =>
      `${r.id},"${r.product}",${r.price_eur},"${r.lookup_key}",${r.url},${r.active},${r.created},${r.allow_promo},${r.discount},${r.duplicated_from}`
    ),
  ].join("\n");

  fs.writeFileSync(csvPath, csv, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");

  console.log("💾 Übersicht gespeichert unter:");
  console.log(" → " + csvPath);
  console.log(" → " + jsonPath);
  console.log("\n✅ Fertig! Alle Payment Links vollständig erfasst.");
}

listAllPaymentLinks();
