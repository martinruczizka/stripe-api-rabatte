// Datei: src/listPromotionCodes.js
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    const list = await stripe.promotionCodes.list({ limit: 10 });
    console.log("\n📋 Aktive Promotion-Codes:");
    list.data.forEach(p => console.log(`• ${p.code}  (${p.id})  ➜  active=${p.active}`));
  } catch (e) {
    console.error("❌ Fehler:", e.message);
  }
})();
