import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
);

(async () => {
  try {
    const products = await stripe.products.list({ limit: 100, active: true });

    console.log("🧾 Aktive Produkte in Stripe:");
    console.log("----------------------------------");
    products.data.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Beschreibung: ${p.description || "(keine)"}`);
      console.log("----------------------------------");
    });
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Produkte:", err.message);
  }
})();

