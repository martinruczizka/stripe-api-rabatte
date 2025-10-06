import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

// 🔁 IDs bitte anpassen
const ORIGINAL_LINK_ID = "plink_1SDVvUAYh6QHq4iYOB7Rhmfc"; // Original mit optionalen Posten
const TARGET_LOOKUP_KEY = "fachpraktikum-shinrin-yoku_50off"; // 50%-Preis
const BACKUP_FILE = `backups/clone_test_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

async function cloneSinglePaymentLink() {
  console.log("🔍 Lade Original-Link...");
  const link = await stripe.paymentLinks.retrieve(ORIGINAL_LINK_ID);

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(link, null, 2));
  console.log(`💾 Original-Link gesichert unter: ${BACKUP_FILE}`);

  console.log("📦 Lade Line Items...");
  const lineItems = await stripe.paymentLinks.listLineItems(ORIGINAL_LINK_ID, { limit: 20 });

  const priceList = await stripe.prices.list({
    lookup_keys: [TARGET_LOOKUP_KEY],
    active: true,
  });
  const discountPrice = priceList.data[0];
  if (!discountPrice) {
    console.error("❌ Kein Preis mit Lookup-Key gefunden:", TARGET_LOOKUP_KEY);
    return;
  }

  // ⚙️ Nur nicht-leere after_completion-Werte übernehmen
  let afterCompletion = {};
  if (link.after_completion?.type === "hosted_confirmation") {
    const msg = link.after_completion.hosted_confirmation?.custom_message;
    afterCompletion = {
      type: "hosted_confirmation",
      hosted_confirmation: {
        custom_message: msg && msg.trim() !== "" ? msg : undefined,
      },
    };
  } else if (link.after_completion?.type === "redirect") {
    afterCompletion = link.after_completion;
  }

  console.log("🪄 Erstelle neuen Link mit 50%-Preis und allen optionalen Posten...");
  const newLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: discountPrice.id,
        quantity: 1,
      },
    ],
    after_completion: afterCompletion,
    metadata: {
      cloned_from: ORIGINAL_LINK_ID,
      discount: "50%",
    },
    allow_promotion_codes: false,
    automatic_tax: link.automatic_tax,
    invoice_creation: { enabled: true },
    custom_fields: link.custom_fields || [],
    custom_text: link.custom_text || {},
  });

  console.log(`✅ Neuer Link erstellt: ${newLink.url}`);
}

cloneSinglePaymentLink().catch((err) => {
  console.error("❌ Fehler:", err.message);
});
