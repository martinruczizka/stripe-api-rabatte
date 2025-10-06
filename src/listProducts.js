// Datei: src/listProducts.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

export default async function main() {
  try {
    const products = await stripe.products.list({ limit: 100, expand: ["data.default_price"] });
    console.log("✅ Gefundene Produkte:");
    products.data.forEach((p) => {
      const price = p.default_price?.unit_amount ? (p.default_price.unit_amount / 100).toFixed(2) : "n/a";
      console.log(
        `${p.name}\t${p.id}\t${p.default_price?.id || "n/a"}\t${price} €\t${p.default_price?.currency?.toUpperCase() || "EUR"}`
      );
    });
  } catch (err) {
    console.error("❌ Fehler beim Abrufen:", err.message);
  }
}

main();
