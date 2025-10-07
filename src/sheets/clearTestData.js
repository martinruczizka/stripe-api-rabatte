// src/sheets/clearTestData.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Sicherheitsabfrage: Prüfe Secret Keys
const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST;
const stripeLiveKey = process.env.STRIPE_SECRET_KEY_LIVE;

if (!stripeTestKey || !stripeLiveKey) {
  console.error('❌ Fehlende Stripe-Keys! Prüfe STRIPE_SECRET_KEY_TEST und STRIPE_SECRET_KEY_LIVE in .env.');
  process.exit(1);
}

if (!stripeTestKey.startsWith('sk_test_')) {
  console.error('🚨 Sicherheitsabbruch: STRIPE_SECRET_KEY_TEST ist kein Test-Key!');
  process.exit(1);
}

if (stripeLiveKey === stripeTestKey) {
  console.error('🚨 Sicherheitsabbruch: STRIPE_SECRET_KEY_TEST und STRIPE_SECRET_KEY_LIVE sind identisch!');
  process.exit(1);
}

const stripe = new Stripe(stripeTestKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: ${stripeTestKey.startsWith('sk_test') ? 'TEST' : 'ERROR'}`);

async function clearTestData() {
  console.log('🧹 Starte Bereinigung aller Testdaten...');
  const products = await stripe.products.list({ limit: 100 });
  for (const product of products.data) {
    await stripe.products.update(product.id, { active: false });
    const prices = await stripe.prices.list({ product: product.id, limit: 100 });
    for (const price of prices.data) {
      await stripe.prices.update(price.id, { active: false });
    }
    console.log(`🗑️ Produkt deaktiviert: ${product.name} (${product.id})`);
  }
  console.log('🧹 Bereinigung abgeschlossen!');
}

clearTestData().catch(err => {
  console.error('❌ Fehler bei der Bereinigung:', err.message);
  process.exit(1);
});