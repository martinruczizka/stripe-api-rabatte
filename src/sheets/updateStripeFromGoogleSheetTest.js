// src/sheets/updateStripeFromGoogleSheetTest.js
import Stripe from 'stripe';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { optionalItemsMapTests } from '../utils/optionalItemsMapTests.js';

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

const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const sheetRange = process.env.GOOGLE_SHEET_RANGE || 'test_products!A1:O';

if (!spreadsheetId || !process.env.GOOGLE_CREDENTIALS_PATH) {
  console.error('❌ Fehlende .env-Variablen: GOOGLE_SHEET_ID oder GOOGLE_CREDENTIALS_PATH');
  process.exit(1);
}

if (!sheetRange.startsWith('test_')) {
  console.error('🚨 Sicherheitsabbruch: Sheet ist kein Test-Tab!');
  process.exit(1);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getSheetData(spreadsheetId, range = sheetRange) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Keine Daten in Google Sheet gefunden.');
    const headers = rows[0];
    const data = rows.slice(1).map(row =>
      headers.reduce((obj, header, i) => {
        const value = row[i] || '';
        return header === 'Sort' ? obj : { ...obj, [header]: value };
      }, {})
    );
    return data;
  } catch (err) {
    console.error('❌ Fehler beim Lesen des Google Sheets:', err.message);
    process.exit(1);
  }
}

async function validateProductAndPrice(productId, defaultPriceData) {
  try {
    const product = await stripe.products.retrieve(productId);
    if (!product.active) {
      throw new Error(`Produkt ${productId} ist inaktiv.`);
    }
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
    let priceId;
    if (prices.data.length === 0) {
      if (defaultPriceData && defaultPriceData.unitAmount && defaultPriceData.currency) {
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: defaultPriceData.unitAmount,
          currency: defaultPriceData.currency.toLowerCase(),
          tax_behavior: defaultPriceData.taxBehavior,
          recurring: defaultPriceData.recurring,
          metadata: { type: defaultPriceData.type || 'main' },
        });
        console.log(`💵 Neuer Preis erstellt für ${productId}: ${newPrice.id} (${(defaultPriceData.unitAmount / 100).toFixed(2)} ${defaultPriceData.currency})`);
        priceId = newPrice.id;
      } else {
        throw new Error(`Kein aktiver Preis für ${productId} und keine Preisdaten vorhanden.`);
      }
    } else {
      priceId = prices.data[0].id;
    }
    return { product, priceId };
  } catch (err) {
    console.error(`❌ Fehler bei Produkt ${productId}: ${err.message}`);
    return null;
  }
}

async function updateStripeFromSheet(spreadsheetId) {
  try {
    const sheetData = await getSheetData(spreadsheetId);
    console.log(`📥 ${sheetData.length} Zeilen aus Google Sheet geladen.`);

    for (const row of sheetData) {
      const updateFlag = row['Update'] && ['true', 'TRUE', '1'].includes(row['Update'].toString().trim().toLowerCase());
      if (!updateFlag) {
        console.log(`⏭️ Überspringe Zeile: ${row['Produkt']} (Update: ${row['Update'] || 'nicht gesetzt'})`);
        continue;
      }

      const productName = row['Produkt'];
      const productId = row['Produkt-ID'];
      const description = row['Beschreibung'] || '';
      const images = row['Bilder'] && row['Bilder'] !== 'n/a' ? row['Bilder'].split(', ') : [];
      const fachbereich = row['Fachbereich'] || 'n/a';
      const keyword = row['Suchschlüssel'] || 'n/a';
      const priceRaw = row['Preis pro Einheit'] || '';
      const priceId = row['Preis-ID'] || '';
      const currency = row['Währung'] || 'EUR';
      const taxBehavior = row['Steuerverhalten'] === 'Inklusive' ? 'inclusive' : row['Steuerverhalten'] === 'Exklusive' ? 'exclusive' : 'unspecified';
      const isDefaultPrice = row['Standardpreis'] === 'Ja';
      const intervall = row['Intervall'] || 'Einmalig';

      const unitAmount = parseFloat(priceRaw.replace(/[^\d,]/g, '').replace(',', '.')) * 100;
      if (!productName || isNaN(unitAmount)) {
        console.warn(`⚠️ Überspringe Zeile: ${productName} (ungültiger Name/Preis)`);
        continue;
      }

      let product;
      if (productId) {
        try {
          product = await stripe.products.update(productId, {
            name: productName,
            description: description || undefined,
            images: images.length > 0 ? images : undefined,
            metadata: { fachbereich, keyword, type: 'main' },
            active: true,
          });
          console.log(`♻️ Produkt aktualisiert (TEST): ${productName} (${productId})`);
        } catch (err) {
          console.warn(`⚠️ Produkt ${productName} nicht gefunden, erstelle neu...`);
          product = await stripe.products.create({
            name: productName,
            description: description || undefined,
            images: images.length > 0 ? images : undefined,
            metadata: { fachbereich, keyword, type: 'main' },
            active: true,
          });
          console.log(`🆕 Produkt erstellt (TEST): ${productName} (${product.id})`);
        }
      } else {
        const existingProducts = await stripe.products.search({
          query: `name:"${productName}"`,
        });
        if (existingProducts.data.length > 0) {
          console.warn(`⚠️ Mögliches Duplikat: Produkt ${productName} existiert bereits (ID: ${existingProducts.data[0].id}). Überspringe Erstellung.`);
          continue;
        }
        product = await stripe.products.create({
          name: productName,
          description: description || undefined,
          images: images.length > 0 ? images : undefined,
          metadata: { fachbereich, keyword, type: 'main' },
          active: true,
        });
        console.log(`🆕 Produkt erstellt (TEST): ${productName} (${product.id})`);
      }

      // Hauptpreis verarbeiten
      const prices = await stripe.prices.list({ product: product.id, limit: 50 });
      const recurring = intervall !== 'Einmalig' ? { interval: intervall.toLowerCase() } : undefined;
      const priceData = {
        unitAmount,
        currency,
        taxBehavior,
        recurring,
        type: 'main',
      };
      let defaultPriceId;
      const matchingPrice = prices.data.find(p =>
        p.unit_amount === unitAmount &&
        p.currency.toLowerCase() === currency.toLowerCase() &&
        p.tax_behavior === taxBehavior &&
        JSON.stringify(p.recurring) === JSON.stringify(recurring)
      );

      if (priceId && priceId !== '') {
        const existingPrice = prices.data.find(p => p.id === priceId);
        if (existingPrice) {
          if (
            existingPrice.unit_amount !== unitAmount ||
            existingPrice.currency.toLowerCase() !== currency.toLowerCase() ||
            existingPrice.tax_behavior !== taxBehavior ||
            JSON.stringify(existingPrice.recurring) !== JSON.stringify(recurring)
          ) {
            await stripe.prices.update(priceId, { active: false });
            console.log(`🗑️ Alter Preis deaktiviert (TEST) für ${productName}: ${priceId}`);
            const newPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: unitAmount,
              currency: currency.toLowerCase(),
              tax_behavior: taxBehavior,
              recurring,
              metadata: { type: 'main' },
            });
            defaultPriceId = newPrice.id;
            console.log(`💵 Neuer Preis erstellt (TEST) für ${productName}: ${newPrice.id} (${(unitAmount / 100).toFixed(2)} ${currency})`);
          } else {
            defaultPriceId = priceId;
            console.log(`✅ Preis bereits aktuell (TEST) für ${productName}: ${priceId}`);
          }
        } else {
          console.warn(`⚠️ Preis-ID ${priceId} nicht gefunden für ${productName}. Erstelle neuen Preis.`);
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: unitAmount,
            currency: currency.toLowerCase(),
            tax_behavior: taxBehavior,
            recurring,
            metadata: { type: 'main' },
          });
          defaultPriceId = newPrice.id;
          console.log(`💵 Neuer Preis erstellt (TEST) für ${productName}: ${newPrice.id} (${(unitAmount / 100).toFixed(2)} ${currency})`);
        }
      } else if (!matchingPrice) {
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: currency.toLowerCase(),
          tax_behavior: taxBehavior,
          recurring,
          metadata: { type: 'main' },
        });
        defaultPriceId = newPrice.id;
        console.log(`💵 Neuer Preis erstellt (TEST) für ${productName}: ${newPrice.id} (${(unitAmount / 100).toFixed(2)} ${currency})`);
      } else {
        defaultPriceId = matchingPrice.id;
        console.log(`✅ Preis bereits aktuell (TEST) für ${productName}: ${matchingPrice.id}`);
      }

      if (isDefaultPrice && product.default_price !== defaultPriceId) {
        await stripe.products.update(product.id, { default_price: defaultPriceId });
        console.log(`📌 Default-Preis gesetzt (TEST) für ${productName}: ${defaultPriceId}`);
      }

      // Optionale Items aus dem hardcodierten Mapping verarbeiten
      if (optionalItemsMapTests[product.id]) {
        console.log(`🛒 Verarbeite ${optionalItemsMapTests[product.id].length} optionale Items für ${productName} (${product.id})...`);
        for (const optProductId of optionalItemsMapTests[product.id]) {
          const optProductData = await validateProductAndPrice(optProductId, {
            unitAmount, // Fallback: Preis des Hauptprodukts verwenden
            currency,
            taxBehavior,
            recurring,
            type: 'optional',
          });
          if (!optProductData) {
            console.warn(`⚠️ Optionales Produkt ${optProductId} konnte nicht validiert werden.`);
            continue;
          }
          const { product: optProduct, priceId: optPriceId } = optProductData;
          console.log(`🛒 Optionales Item konfiguriert (TEST): ${optProduct.name} (${optPriceId}), Menge: 1 (fest)`);
        }
      }

      await wait(200);
    }

    console.log('🏁 Update mit optionalen Items abgeschlossen (TEST)!');
    console.log('💡 Verwende die Preise in Checkout-Sessions mit optional_items Parameter.');
  } catch (err) {
    console.error('❌ Fehler beim Update (TEST):', err.message);
  }
}

async function runUpdate() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await updateStripeFromSheet(spreadsheetId);
}

runUpdate();