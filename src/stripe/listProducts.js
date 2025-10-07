<<<<<<< HEAD
// Datei: src/listProducts.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);
=======
import 'dotenv/config';
import Stripe from 'stripe';

// 🧩 1️⃣ Stripe-Key automatisch wählen (Reihenfolge: Live > Test > Default)
const stripeKey =
  process.env.STRIPE_SECRET_KEY_LIVE ||
  process.env.STRIPE_SECRET_KEY_TEST ||
  process.env.STRIPE_SECRET_KEY;

// 🧠 2️⃣ Prüfen, ob ein Key gefunden wurde
if (!stripeKey) {
  console.error("❌ Kein Stripe-Key gefunden! Bitte prüfe Vercel oder .env.");
  process.exit(1);
}

// 🚀 3️⃣ Stripe initialisieren
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

// 🔍 4️⃣ Modus anzeigen
console.log(
  `🔑 Verwende Key: ${
    stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST'
  }`
);
>>>>>>> 6044160 (Deine kurze Beschreibung)

// 🧾 5️⃣ Produkte abrufen
export default async function main() {
  try {
<<<<<<< HEAD
    const products = await stripe.products.list({ limit: 100, expand: ["data.default_price"] });
    console.log("✅ Gefundene Produkte:");
    products.data.forEach((p) => {
      const price = p.default_price?.unit_amount ? (p.default_price.unit_amount / 100).toFixed(2) : "n/a";
      console.log(
        `${p.name}\t${p.id}\t${p.default_price?.id || "n/a"}\t${price} €\t${p.default_price?.currency?.toUpperCase() || "EUR"}`
=======
    const products = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price'],
    });

    if (products.data.length === 0) {
      console.log("⚠️ Keine Produkte gefunden.");
      return;
    }

    console.log("✅ Gefundene Produkte:\n");

    products.data.forEach((p) => {
      const price = p.default_price?.unit_amount
        ? (p.default_price.unit_amount / 100).toFixed(2)
        : 'n/a';
      console.log(
        `- ${p.name}\t(${p.id})\t${p.default_price?.id || 'n/a'}\t${price} €`
>>>>>>> 6044160 (Deine kurze Beschreibung)
      );
    });
  } catch (err) {
    console.error('❌ Fehler beim Abrufen:', err.message);
  }
}

main();
