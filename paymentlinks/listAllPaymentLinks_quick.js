import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

async function listAllPaymentLinksQuick() {
  console.log("📦 Lade alle Payment Links...");
  const allLinks = await stripe.paymentLinks.list({ limit: 100 });

  console.log(`✅ ${allLinks.data.length} Payment Links gefunden:\n`);
  allLinks.data.forEach(link => {
    const created = link.created ? new Date(link.created * 1000).toISOString().split("T")[0] : "–";
    console.log(`🔗 ${link.url} | ${link.metadata?.discount || "-"} | ${created}`);
  });

  console.log("\n🎉 Fertig!");
}

listAllPaymentLinksQuick();
