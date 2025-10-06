import Stripe from "stripe";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

async function backupPaymentLinks() {
  console.log("📦 Lade alle Payment Links...");
  const allLinks = [];
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const params = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;

    const res = await stripe.paymentLinks.list(params);
    allLinks.push(...res.data);
    hasMore = res.has_more;
    if (hasMore) startingAfter = res.data[res.data.length - 1].id;
  }

  console.log(`✅ ${allLinks.length} Payment Links gefunden. Lade Details...`);

  const enriched = [];
  for (const link of allLinks) {
    const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 10 });

    enriched.push({
      id: link.id,
      url: link.url,
      created: link.created ? new Date(link.created * 1000).toISOString() : null,
      metadata: link.metadata,
      after_completion: link.after_completion,
      allow_promotion_codes: link.allow_promotion_codes,
      automatic_tax: link.automatic_tax,
      consent_collection: link.consent_collection,
      active: link.active,
      archived: link.livemode === false,
      line_items: lineItems.data.map(item => ({
        description: item.description,
        price_id: item.price.id,
        product_id: item.price.product,
        quantity: item.quantity,
      })),
    });
  }

  fs.writeFileSync("payment_links_backup.json", JSON.stringify(enriched, null, 2));
  console.log("💾 Backup gespeichert unter payment_links_backup.json");
}

backupPaymentLinks();
