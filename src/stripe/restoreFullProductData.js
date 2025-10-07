import 'dotenv/config';
import Stripe from 'stripe';
import fs from 'fs';

// =============================================================
// 🔁 STRIPE PRODUCT RESTORE
// Stellt Produkte + Preise aus JSON wieder her
// =============================================================

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY_TEST,
  { apiVersion: '2024-06-20' }
);

const data = JSON.parse(fs.readFileSync('backupFullProductData.json', 'utf8'));

const restoreProducts = async () => {
  for (const p of data) {
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      images: p.images,
      metadata: p.metadata,
    });

    if (p.prices && p.prices.length > 0) {
      for (const price of p.prices) {
        await stripe.prices.create({
          product: product.id,
          currency: price.currency || 'eur',
          unit_amount: price.unit_amount,
          tax_behavior: price.tax_behavior || 'inclusive',
        });
      }
    }

    console.log(`✅ Produkt wiederhergestellt: ${product.name}`);
  }

  console.log('🎯 Wiederherstellung abgeschlossen!');
};

restoreProducts().catch((err) =>
  console.error('❌ Fehler bei Wiederherstellung:', err.message)
);
