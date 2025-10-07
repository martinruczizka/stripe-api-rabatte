/**
 * createDynamicSession.js
 * Dynamische Stripe Checkout Session:
 * Parameter: ?kurs=mentaltraining&rabatt=SITYA50
 */

import dotenv from "dotenv";
import Stripe from "stripe";
import url from "url";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

// 🔹 Kurs-Zuordnung: Lookup-Key → Preis-ID
const PRICE_MAP = {
  mentaltraining: "price_1SDt6cAYh6QHq4iYRBhzMjwi",
  humanenergetik: "price_XXXXXXXXXXXXXXX",
  tierenergetik: "price_XXXXXXXXXXXXXXX",
  // weitere Kurse einfach hier ergänzen
};

(async () => {
  try {
    // URL-Parameter auslesen
    const query = url.parse(process.argv[2] || "", true).query;
    const kurs = query.kurs?.toLowerCase();
    const rabatt = query.rabatt?.toUpperCase();

    if (!kurs || !PRICE_MAP[kurs]) {
      throw new Error("❌ Ungültiger oder fehlender Kursparameter (?kurs=...)");
    }

    const priceId = PRICE_MAP[kurs];
    console.log(`\n📦 Kurs: ${kurs}`);
    console.log(`💶 Preis-ID: ${priceId}`);
    console.log(`🏷️ Rabattcode: ${rabatt || "kein Rabatt"}`);

    // Promotion-Code-ID laden (wenn vorhanden)
    let promoId = null;
    if (rabatt) {
      const promoList = await stripe.promotionCodes.list({ code: rabatt, active: true });
      if (promoList.data.length > 0) {
        promoId = promoList.data[0].id;
        console.log(`✅ Rabattcode gefunden: ${promoId}`);
      } else {
        console.log("⚠️ Rabattcode nicht gefunden oder inaktiv.");
      }
    }

    // Session erstellen
    const sessionData = {
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      invoice_creation: { enabled: true },
      metadata: { kurs, rabatt: rabatt || "none" },
    };

    if (promoId) sessionData.discounts = [{ promotion_code: promoId }];

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log("\n✅ Dynamische Checkout Session erstellt:");
    console.log(session.url);
  } catch (error) {
    console.error("\n❌ Fehler:", error.message);
  }
})();
