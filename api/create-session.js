/**
 * API Endpoint: /api/create-session
 * Dynamisch erzeugter Stripe Checkout (inkl. Rabattcode)
 * Beispielaufruf:
 * https://api-checkout.institut-sitya.at/api/create-session?kurs=mentaltraining&rabatt=SITYA50
 */

import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

    // 1️⃣ Query-Parameter lesen
    const { kurs, rabatt } = req.query;
    if (!kurs) return res.status(400).json({ error: "Fehlender Parameter ?kurs=" });

    // 2️⃣ Kurs → Preis-ID Mapping (alle Stripe-Preis-IDs eintragen)
    const PRICE_MAP = {
      humanenergetiker: "price_1SDt5hAYh6QHq4iYxExbzyuE",
      tierenergetiker: "price_1SDt6iAYh6QHq4iYZjUj8x6T",
      mentaltraining: "price_1SDt6cAYh6QHq4iYRBhzMjwi",
      ernährungstraining: "price_1SDt7dAYh6QHq4iYXbMpkAfU",
      kräuterpädagogik: "price_1SDt8hAYh6QHq4iY4WqA7zPo",
      naturpädagogik: "price_1SDt9fAYh6QHq4iYg1z4DqLs",
      achtsamkeit: "price_1SDtAfAYh6QHq4iYbzV8kzRk",
      resilienz: "price_1SDtBgAYh6QHq4iYTrN5qEzG",
      aromaberatung: "price_1SDtCgAYh6QHq4iYdZ7LpV1h",
      bachblüten: "price_1SDtDgAYh6QHq4iYRZsYtZtN",
      kinesiologie: "price_1SDtEgAYh6QHq4iYUzF8Z2kP",
      klangenergetik: "price_1SDtFgAYh6QHq4iYzXqK2zP8",
    };

    const priceId = PRICE_MAP[kurs.toLowerCase()];
    if (!priceId) return res.status(404).json({ error: `Unbekannter Kurs: ${kurs}` });

    // 3️⃣ Rabattcode prüfen
    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      if (promos.data.length > 0) promoId = promos.data[0].id;
    }

    // 4️⃣ Session erstellen
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

    // 5️⃣ Erfolgsantwort: Checkout-URL zurückgeben
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
