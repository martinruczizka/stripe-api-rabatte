import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

// 🔑 Test-Key laden (Fallback auf allgemeinen Secret Key)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY);

async function listProducts() {
  console.log("🚀 Lade alle Produkte aus der TEST-Umgebung …\n");

  try {
    const products = await stripe.products.list({
      limit: 100,
      expand: ["data.default_price"],
    });

    if (!products.data.length) {
      console.log("⚠️ Keine Produkte gefunden!");
      return;
    }

    for (const p of products.data) {
      const price = p.default_price;
      const unit_amount = price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : "—";
      const currency = price?.currency?.toUpperCase() || "—";

      console.log(`📦 ${p.name}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Fachbereich: ${p.metadata?.fachbereich || "—"}`);
      console.log(`   Preis: ${unit_amount} ${currency}`);
      console.log("--------------------------------------------------------");
    }

    console.log(`\n✅ Insgesamt ${products.data.length} Produkte gefunden.`);
  } catch (error) {
    console.error("❌ Fehler beim Laden der Produkte:", error.message);
  }
}

listProducts();
