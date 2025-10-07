/**
 * createSessionWithDiscount.js
 * Erstellt einen Stripe Checkout mit automatisch aktivem Rabattcode „SITYA50“
 * für „Dipl. Mentaltraining“ (Basispreis 1.749 €)
 */

import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    // Preis-ID und Promotion-Code-ID anpassen (Promo-ID aus deinem letzten Output)
    const PRICE_ID = "price_1SDt6cAYh6QHq4iYRBhzMjwi"; // Dipl. Mentaltraining
    const PROMO_ID = "promo_1SF6CzAYh6QHq4iYPSzoqhvr"; // SITYA50

    // Checkout Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      discounts: [
        {
          promotion_code: PROMO_ID, // Rabatt wird automatisch angewendet
        },
      ],
      invoice_creation: { enabled: true }, // Rechnung aktivieren
      success_url:
        "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      metadata: {
        kurs: "Dipl. Mentaltraining",
        rabattcode: "SITYA50",
      },
    });

    console.log("\n✅ Checkout Session mit Rabatt erstellt:");
    console.log(session.url);
  } catch (error) {
    console.error("\n❌ Fehler beim Erstellen:", error.message);
  }
})();
