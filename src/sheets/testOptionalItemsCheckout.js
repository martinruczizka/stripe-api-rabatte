// src/sheets/testOptionalItemsCheckout.js
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { optionalItemsMapTests } from '../utils/optionalItemsMapTests.js';

dotenv.config();

// Sicherheitsabfrage: Prüfe Secret Key
const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST;
if (!stripeTestKey || !stripeTestKey.startsWith('sk_test_')) {
  console.error('❌ Fehlender oder ungültiger Stripe-Test-Key! Prüfe STRIPE_SECRET_KEY_TEST in .env.');
  process.exit(1);
}

const stripe = new Stripe(stripeTestKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: TEST`);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funktion: Produkt und aktiven Preis validieren
async function validateProductAndPrice(productId) {
  try {
    const product = await stripe.products.retrieve(productId);
    if (!product.active) {
      throw new Error(`Produkt ${productId} ist inaktiv.`);
    }
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
    if (prices.data.length === 0) {
      throw new Error(`Kein aktiver Preis für Produkt ${productId} gefunden.`);
    }
    return { product, priceId: prices.data[0].id };
  } catch (err) {
    console.error(`❌ Fehler bei Produkt ${productId}: ${err.message}`);
    return null;
  }
}

// Funktion: Test-Checkout-Session erstellen
async function createTestCheckoutSession(mainProductId, optionalProductIds) {
  try {
    // Validierung des Hauptprodukts
    const mainProductData = await validateProductAndPrice(mainProductId);
    if (!mainProductData) {
      console.error(`❌ Hauptprodukt ${mainProductId} konnte nicht validiert werden.`);
      return;
    }
    const { product: mainProduct, priceId: mainPriceId } = mainProductData;

    // Validierung der optionalen Produkte
    const optionalItems = [];
    for (const optProductId of optionalProductIds) {
      const optProductData = await validateProductAndPrice(optProductId);
      if (optProductData) {
        optionalItems.push({
          price: optProductData.priceId,
          quantity: 1, // Hardcodiert für Kurse
        });
      }
    }

    // Test-Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: mainPriceId,
          quantity: 1, // Hardcodiert für Kurse
        },
      ],
      optional_items: optionalItems.map(item => ({
        price: item.price,
        quantity: item.quantity,
        adjustable_quantity: { enabled: false }, // Hardcodiert: Menge nicht anpassbar
      })),
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        main_product_id: mainProductId,
        test: 'true',
      },
    });

    console.log(`✅ Test-Checkout-Session erstellt für ${mainProduct.name} (${mainProductId}):`);
    console.log(`   URL: ${session.url}`);
    console.log(`   Optionale Items: ${optionalItems.length} (${optionalItems.map(item => item.price).join(', ')})`);
  } catch (err) {
    console.error(`❌ Fehler bei Checkout-Session für ${mainProductId}: ${err.message}`);
  }
}

// Hauptfunktion: Mapping testen
async function testOptionalItemsMapping() {
  console.log('📋 Teste optionalItemsMapTests...');
  const productIds = Object.keys(optionalItemsMapTests);
  console.log(`📈 ${productIds.length} Hauptprodukte gefunden.`);

  for (const mainProductId of productIds) {
    const optionalProductIds = optionalItemsMapTests[mainProductId];
    console.log(`🔍 Teste Hauptprodukt ${mainProductId} mit ${optionalProductIds.length} optionalen Items...`);

    // Validierung des Hauptprodukts
    const mainProductData = await validateProductAndPrice(mainProductId);
    if (!mainProductData) {
      console.warn(`⚠️ Überspringe ${mainProductId}: Produkt oder Preis nicht verfügbar.`);
      continue;
    }

    // Test-Checkout-Session erstellen
    await createTestCheckoutSession(mainProductId, optionalProductIds);
    await wait(500); // Rate-Limit vermeiden
  }

  console.log('🏁 Test abgeschlossen! Überprüfe die Checkout-Session-URLs im Stripe-Dashboard.');
}

testOptionalItemsMapping().catch(err => {
  console.error('❌ Fehler beim Testen des Mappings:', err.message);
  process.exit(1);
});