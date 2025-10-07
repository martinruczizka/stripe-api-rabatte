// syncLiveProductsToTest.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const liveKey = process.env.STRIPE_SECRET_KEY_LIVE;
const testKey = process.env.STRIPE_SECRET_KEY_TEST;

if (!liveKey || !testKey) {
  console.error('❌ Fehlende Keys in .env!');
  process.exit(1);
}

const stripeLive = new Stripe(liveKey, { apiVersion: '2024-06-20' });
const stripeTest = new Stripe(testKey, { apiVersion: '2024-06-20' });

console.log('🔑 Live-Key: ' + (liveKey.startsWith('sk_live') ? 'LIVE' : 'ERROR'));
console.log('🔑 Test-Key: ' + (testKey.startsWith('sk_test') ? 'TEST' : 'ERROR'));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLiveProducts() {
  const allProducts = [];
  let hasMore = true;
  let startingAfter = null;

  console.log('📥 Lade Produkte aus LIVE...');

  while (hasMore) {
    const response = await stripeLive.products.list({
      limit: 100,
      starting_after: startingAfter || undefined,
      expand: ['data.default_price'],
    });

    allProducts.push(...response.data);
    hasMore = response.has_more;
    if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    await wait(200);
  }

  console.log(`✅ ${allProducts.length} Produkte in LIVE gefunden.`);

  for (const product of allProducts) {
    const pricesResponse = await stripeLive.prices.list({
      product: product.id,
      limit: 100,
    });
    product.prices = pricesResponse.data;
    await wait(150);
  }

  return allProducts;
}

async function syncProductToTest(liveProduct) {
  const existingProducts = await stripeTest.products.search({
    query: `name:"${liveProduct.name}"`,
  });
  let testProduct = existingProducts.data[0];

  const productData = {
    name: liveProduct.name,
    active: liveProduct.active ?? true,
    description: liveProduct.description || '',
    images: liveProduct.images || [],
    metadata: liveProduct.metadata || {},
    shippable: liveProduct.shippable === true || liveProduct.shippable === false ? liveProduct.shippable : false,
    statement_descriptor: liveProduct.statement_descriptor || undefined,
    tax_code: liveProduct.tax_code || undefined,
    unit_label: liveProduct.unit_label || undefined,
    url: liveProduct.url || undefined,
  };

  if (!testProduct) {
    testProduct = await stripeTest.products.create(productData);
    console.log(`🆕 Neues Produkt in TEST: ${liveProduct.name} (${testProduct.id})`);
  } else {
    await stripeTest.products.update(testProduct.id, productData);
    console.log(`♻️ Produkt in TEST aktualisiert: ${liveProduct.name} (${testProduct.id})`);
  }

  const existingTestPrices = await stripeTest.prices.list({
    product: testProduct.id,
    limit: 100,
  });

  let defaultPriceId = null;

  for (const livePrice of liveProduct.prices) {
    const matchingTestPrice = existingTestPrices.data.find(p =>
      p.unit_amount === livePrice.unit_amount &&
      p.currency === livePrice.currency &&
      p.tax_behavior === livePrice.tax_behavior &&
      JSON.stringify(p.recurring) === JSON.stringify(livePrice.recurring)
    );

    let testPrice;
    if (!matchingTestPrice) {
      const priceData = {
        product: testProduct.id,
        unit_amount: livePrice.unit_amount,
        currency: livePrice.currency,
        active: livePrice.active ?? true,
        tax_behavior: livePrice.tax_behavior || 'unspecified',
        metadata: livePrice.metadata || {},
        nickname: livePrice.nickname || undefined,
        recurring: livePrice.recurring ? { ...livePrice.recurring } : undefined,
      };
      testPrice = await stripeTest.prices.create(priceData);
      console.log(`💵 Neuer Preis in TEST für ${liveProduct.name}: ${testPrice.id} (${(testPrice.unit_amount / 100).toFixed(2)} ${testPrice.currency.toUpperCase()})`);
    } else {
      if (
        matchingTestPrice.active !== livePrice.active ||
        JSON.stringify(matchingTestPrice.metadata) !== JSON.stringify(livePrice.metadata)
      ) {
        await stripeTest.prices.update(matchingTestPrice.id, { active: false });
        const priceData = {
          product: testProduct.id,
          unit_amount: livePrice.unit_amount,
          currency: livePrice.currency,
          active: livePrice.active ?? true,
          tax_behavior: livePrice.tax_behavior || 'unspecified',
          metadata: livePrice.metadata || {},
          nickname: livePrice.nickname || undefined,
          recurring: livePrice.recurring ? { ...livePrice.recurring } : undefined,
        };
        testPrice = await stripeTest.prices.create(priceData);
        console.log(`♻️ Preis in TEST aktualisiert (neu erstellt): ${liveProduct.name} (${testPrice.id})`);
      } else {
        testPrice = matchingTestPrice;
        console.log(`✅ Preis bereits aktuell in TEST für ${liveProduct.name}`);
      }
    }

    if (liveProduct.default_price && liveProduct.default_price.id === livePrice.id) {
      defaultPriceId = testPrice.id;
    }
  }

  if (defaultPriceId && testProduct.default_price !== defaultPriceId) {
    await stripeTest.products.update(testProduct.id, { default_price: defaultPriceId });
    console.log(`📌 Default-Preis gesetzt für ${liveProduct.name}: ${defaultPriceId}`);
  }

  await wait(200);
}

async function fullSync() {
  try {
    const liveProducts = await fetchLiveProducts();

    for (const liveProduct of liveProducts) {
      await syncProductToTest(liveProduct);
    }

    console.log('\n🏁 Vollständiger Sync abgeschlossen! Alle Daten (Name, Beschreibung, Bilder, Metadata, Preise, etc.) sind in TEST gespiegelt.');
    console.log('👉 Tipp: Überprüfe im Stripe Test-Dashboard oder mit exportFullProductDataToExcel.js (angepasst für TEST).');
  } catch (err) {
    console.error('❌ Fehler beim Sync:', err.message);
  }
}

fullSync();