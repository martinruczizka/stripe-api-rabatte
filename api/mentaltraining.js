import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);
    const rabatt = req.query.rabatt || null;

    const kurs = "mentaltraining";
    const priceId = "price_1SDt6cAYh6QHq4iYRBhzMjwi"; // Live Price-ID

    // Beispiel: Promotion Code mit Zeitlimit (gültig bis Mittwoch)
    const expiresAt = Math.floor(new Date("2025-10-08T23:59:59Z").getTime() / 1000); // Mittwoch 08.10.2025, 23:59 UTC

    // Rabattcode prüfen oder neuen mit Ablaufdatum erstellen
    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase() });

      if (promos.data.length > 0) {
        promoId = promos.data[0].id;
      } else {
        // Beispiel: Neuen Promotion Code mit Ablaufdatum erzeugen
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: "once",
        });

        const promo = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: rabatt.toUpperCase(),
          expires_at: expiresAt, // ⏰ Ablaufdatum (Mittwoch)
        });

        promoId = promo.id;
        console.log(`🕐 Neuer zeitbegrenzter Promotion Code erstellt: ${promo.code}`);
      }
    }

    // Stripe Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.institut-sitya.at/abbruch",
      invoice_creation: { enabled: true },
      discounts: promoId ? [{ promotion_code: promoId }] : undefined,
      metadata: { kurs, rabatt: rabatt || "none" },
    });

    // Weiterleitung zum Stripe Checkout
    return res.redirect(303, session.url);
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    return res.status(500).send("Fehler bei der Weiterleitung: " + error.message);
  }
}
