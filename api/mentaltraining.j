import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY_TEST);
    const rabatt = req.query.rabatt || null;

    // Mapping für Price-ID
    const PRICE_MAP = {
      mentaltraining: "price_1SDt6cAYh6QHq4iYRBhzMjwi", // live-Preis-ID für Mentaltraining
    };

    const kurs = "mentaltraining";  // immer mentaltraining, da der Link diesen Kurs verwenden soll
    const priceId = PRICE_MAP[kurs];

    // Rabattcode prüfen
    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      if (promos.data.length > 0) promoId = promos.data[0].id;
    }

    // Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      invoice_creation: { enabled: true },
      discounts: promoId ? [{ promotion_code: promoId }] : undefined,
      metadata: { kurs, rabatt: rabatt || "none" },
    });

    // Direkt weiterleiten zum Stripe Checkout
    return res.redirect(303, session.url);
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    return res.status(500).send("Fehler bei der Weiterleitung: " + error.message);
  }
}
