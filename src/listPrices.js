import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
);

(async () => {
  try {
    // Alle aktiven Produkte holen
    const products = await stripe.products.list({ limit: 100, active: true });

    console.log("💰 Aktuelle Preise pro Produkt:");
    console.log("------------------------------------------------");

    for (const p of products.data) {
      const prices = await stripe.prices.list({ product: p.id, limit: 10 });

      console.log(`📦 ${p.name} (${p.id})`);
      if (prices.data.length === 0) {
        console.log("   ❌ Keine Preise gefunden");
      } else {
        prices.data.forEach(price => {
          const amount = (price.unit_amount / 100).toFixed(2);
          const currency = price.currency.toUpperCase();
          console.log(`   💶 ${amount} ${currency} | ID: ${price.id}`);
        });
      }
      console.log("------------------------------------------------");
    }
  } catch (err) {
    console.error("❌ Fehler beim Abrufen:", err.message);
  }
})();
