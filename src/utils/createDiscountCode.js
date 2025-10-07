import dotenv from "dotenv";
import Stripe from "stripe";
import fetch from "node-fetch";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    // 1️⃣ Coupon anlegen
    const coupon = await stripe.coupons.create({
      name: "50 % Rabatt – SITYA Herbstaktion",
      percent_off: 50,
      duration: "once",
    });

    console.log("✅ Coupon erstellt:", coupon.id);

    // 2️⃣ Promotion-Code über direkten API-Call erstellen
    const response = await fetch("https://api.stripe.com/v1/promotion_codes", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: "SITYA50",
        coupon: coupon.id,
        active: "true",
      }),
    });

    const promo = await response.json();

    if (promo.error) throw new Error(promo.error.message);

    console.log("\n✅ Promotion-Code erstellt:");
    console.log("Code:", promo.code);
    console.log("ID:", promo.id);
  } catch (error) {
    console.error("\n❌ Fehler beim Erstellen:", error.message);
  }
})();
