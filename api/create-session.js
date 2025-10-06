/**
 * API Endpoint: /api/create-session
 * Dynamisch erzeugter Stripe Checkout (inkl. Rabattcode)
 * Beispielaufruf:
 * https://checkout.institut-sitya.at/api/create-session?kurs=mentaltraining&rabatt=SITYA50
 */

import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

    // Query-Parameter lesen
    const { kurs, rabatt } = req.query;
    if (!kurs) return res.status(400).json({ error: "Fehlender Parameter ?kurs=" });

    // 🔹 Kurs → Preis-ID Mapping
    const PRICE_MAP = {
      mentaltraining: "price_1SDt6cAYh6QHq4iYRBhzMjwi",
      // weitere Kurse hier ergänzen
    };

    const priceId = PRICE_MAP[kurs.toLowerCase()];
    if (!priceId) return res.status(404).json({ error: "Unbekannter Kurs" });

    // Rabattcode prüfen
    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      if (promos.data.length > 0) promoId = promos.data[0].id;
    }

    // Session erstellen
    const sessionData = {
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      invoice_creation: { enabled: true },
      metadata: { kurs, rabatt: rabatt || "none" },
    };
    if (promoId) sessionData.discounts = [{ promotion_code: promoId }];

    const session = await stripe.checkout.sessions.create(sessionData);

    // ✅ Erfolgsantwort: Session-URL zurückgeben
    return res.status(200).json({
      success: true,
      kurs,
      rabatt: rabatt || null,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
