import Stripe from 'stripe';

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
);

export default async function main() {
  try {
    const products = await stripe.products.list({ limit: 100 });
    console.log("✅ Gefundene Produkte:");
    products.data.forEach((p) => {
      console.log(`- ${p.name} (${p.id})`);
    });
  } catch (err) {
    console.error("❌ Fehler beim Abrufen:", err.message);
  }
}

main();
