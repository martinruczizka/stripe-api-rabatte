// /workspaces/stripe-product-mapper/src/sheets/line-items-CheckoutTest.js
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { lineItemsMapTests } from '../utils/line-items-MapTests.js';

dotenv.config();

const KEYS_MAP = {
  'prod_TBx6SiknnBM7SQ': 'aromaberater',
  'prod_TBx6fHVSi1cO0c': 'bachbluetenberater',
  'prod_TBx6EkQidwn3Ze': 'fachberater-raeuchermischungen',
  'prod_TBx6XCAkvirUWI': 'farbtherapie',
  'prod_TBx60WNkX2qt5H': 'feng-shui-pflanzenberatung',
  'prod_T9megpJzxDa3Hw': 'humanenergetiker',
  'prod_TBx6SvkJvo12PE': 'kinesiologie',
  'prod_TBx6DVd8qgxg3z': 'klangenergetiker',
  'prod_TBx6Rd44XDkvQ2': 'schamanische-rituale',
  'prod_TBx6gKGstmXFjN': 'ayurveda-ernaehrungstraining',
  'prod_TACoUJJ1WJKMI1': 'ernaehrungstrainer',
  'prod_TBx6UUW8DhCkkY': 'tcm-ernaehrungstraining',
  'prod_TBx6QCmf5OGik4': 'tierenergetiker-basis',
  'prod_T9mfwA0CMVlc91': 'tierenergetiker',
  'prod_TBx6wwFiSk6ixQ': 'tierenergetiker-hund',
  'prod_TBx6BwNNgWxG3k': 'tierenergetiker-katze',
  'prod_TBx6hVadtfAtfq': 'tierenergetiker-pferd',
  'prod_TBx6cgYV9s8Jlw': 'bachbluetenhunde',
  'prod_TBx6b9BrnlYu58': 'ayurveda-kraueterspezialist',
  'prod_TBx6jPYSLUYbKj': 'knospenkunde',
  'prod_TBx6u1wAULwWNN': 'kraeuterberater-anbau-innen',
  'prod_TACo4pE4TC10Si': 'kraeuterpaedagoge',
  'prod_TBx6h64dhmeWmg': 'kraeuterteeberater',
  'prod_TBx6QaLGnvT6Iq': 'wildkraeuter-praktiker',
  'prod_TBx6EZTh4KgTqh': 'achtsamkeitstrainer',
  'prod_TBx6oIb6F3Eg5C': 'fachpraktikum-shinrin-yoku',
  'prod_T9mgUomiUhdbCi': 'mentaltrainer',
  'prod_TBx7xGNMTXSduF': 'naturunderlebnispaedagoge',
  'prod_TBx6VmlBefkCDm': 'resilienztrainer',
};

const stripeTestKey = process.env.STRIPE_SECRET_KEY_TEST;
if (!stripeTestKey || !stripeTestKey.startsWith('sk_test_')) {
  console.error('❌ Fehlender oder ungültiger Stripe-Test-Key! Prüfe STRIPE_SECRET_KEY_TEST in .env.');
  process.exit(1);
}

const stripe = new Stripe(stripeTestKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: TEST`);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    return { product, priceId: prices.data[0].id, key: KEYS_MAP[productId] || product.metadata.key || 'unknown' };
  } catch (err) {
    console.error(`❌ Fehler bei Produkt ${productId}: ${err.message}`);
    return null;
  }
}

async function createTestCheckoutSession(mainProductId, bundleProductIds) {
  try {
    const mainProductData = await validateProductAndPrice(mainProductId);
    if (!mainProductData) {
      console.error(`❌ Hauptprodukt ${mainProductId} konnte nicht validiert werden.`);
      return;
    }
    const { product: mainProduct, priceId: mainPriceId, key: mainKey } = mainProductData;
    const rabatt = 'dasisteinebeispielaktion';

    let promoId = null;
    if (rabatt) {
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      if (promos.data.length > 0) {
        promoId = promos.data[0].id;
      } else {
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: 'once',
        });
        const promo = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: rabatt.toUpperCase(),
          expires_at: Math.floor(new Date('2025-10-08T23:59:59Z').getTime() / 1000),
        });
        promoId = promo.id;
        console.log(`🕐 Neuer zeitbegrenzter Promotion Code erstellt: ${promo.code}`);
      }
    }

    const lineItems = [
      {
        price: mainPriceId,
        quantity: 1,
      },
    ];
    for (const bundleProductId of bundleProductIds) {
      const bundleProductData = await validateProductAndPrice(bundleProductId);
      if (bundleProductData) {
        lineItems.push({
          price: bundleProductData.priceId,
          quantity: 1,
          adjustable_quantity: { enabled: false },
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      invoice_creation: { enabled: true },
      discounts: promoId ? [{ promotion_code: promoId }] : undefined,
      metadata: { main_product_id: mainProductId, main_key: mainKey, rabatt: rabatt || 'none' },
    });

    console.log(`✅ Test-Checkout-Session erstellt für ${mainProduct.name} (${mainProductId}, key: ${mainKey}):`);
    console.log(`   URL: ${session.url}`);
    console.log(`   Mit Rabatt: ${session.url}?rabatt=${rabatt}`);
    console.log(`   Bundle Items: ${lineItems.length - 1} (${lineItems.slice(1).map(item => item.price).join(', ')})`);
  } catch (err) {
    console.error(`❌ Fehler bei Checkout-Session für ${mainProductId}: ${err.message}`);
  }
}

async function testLineItemsMapping() {
  console.log('📋 Teste lineItemsMapTests...');
  const productIds = Object.keys(lineItemsMapTests);
  console.log(`📈 ${productIds.length} Hauptprodukte gefunden.`);

  for (const mainProductId of productIds) {
    const bundleProductIds = lineItemsMapTests[mainProductId];
    console.log(`🔍 Teste Hauptprodukt ${mainProductId} mit ${bundleProductIds.length} Bundle-Items...`);

    const mainProductData = await validateProductAndPrice(mainProductId);
    if (!mainProductData) {
      console.warn(`⚠️ Überspringe ${mainProductId}: Produkt oder Preis nicht verfügbar.`);
      continue;
    }

    await createTestCheckoutSession(mainProductId, bundleProductIds);
    await wait(500);
  }

  console.log('🏁 Test abgeschlossen! Überprüfe die Checkout-Session-URLs im Stripe-Dashboard.');
}

testLineItemsMapping().catch(err => {
  console.error('❌ Fehler beim Testen des Mappings:', err.message);
  process.exit(1);
});