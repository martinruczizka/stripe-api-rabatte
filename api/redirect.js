/**
 * Universeller Stripe Redirect für alle Kurse
 * Beispiel:
 * https://api-checkout.institut-sitya.at/api/redirect?kurs=mentaltraining&rabatt=SITYA50
 */

import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);
    const { kurs, rabatt } = req.query;

    if (!kurs) {
      return res.status(400).send("❌ Fehler: Parameter ?kurs= fehlt.");
    }

    // Kurs → Preis-ID Mapping
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
    if (!priceId) return res.status(404).send(`❌ Unbekannter Kurs: ${kurs}`);

    // Rabattcode prüfen
    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      if (promos.data.length > 0) promoId = promos.data[0].id;
    }

    // Checkout Session erzeugen
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      invoice_creation: { enabled: true },
      discounts: promoId ? [{ promotion_code: promoId }] : undefined,
      metadata: { kurs, rabatt: rabatt || "none" },
    });

    // 🚀 Weiterleitung
    return res.redirect(303, session.url);

  } catch (error) {
    console.error("❌ Redirect Fehler:", error.message);
    return res.status(500).send("Fehler: " + error.message);
  }
}
