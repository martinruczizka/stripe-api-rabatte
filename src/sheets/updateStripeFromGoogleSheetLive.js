// src/sheets/updateStripeFromGoogleSheetLive.js
import Stripe from 'stripe';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY_LIVE;
if (!stripeKey) {
  console.error('❌ Kein Stripe Live-Key gefunden! Prüfe STRIPE_SECRET_KEY_LIVE in .env.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: ${stripeKey.startsWith('sk_live') ? 'LIVE' : 'ERROR'}`);

const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

if (!spreadsheetId || !process.env.GOOGLE_CREDENTIALS_PATH) {
  console.error('❌ Fehlende .env-Variablen: GOOGLE_SHEET_ID oder GOOGLE_CREDENTIALS_PATH');
  process.exit(1);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getSheetData(spreadsheetId, range = 'live_products!A1:O') {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) throw new Error('Keine Daten in Google Sheet gefunden.');

  const headers = rows[0];
  const data = rows.slice(1).map(row =>
    headers.reduce((obj, header, i) => ({ ...obj, [header]: row[i] || '' }), {})
  );
  return data;
}

async function updateStripeFromSheet(spreadsheetId) {
  try {
    const sheetData = await getSheetData(spreadsheetId);
    console.log(`📥 ${sheetData.length} Zeilen aus Google Sheet geladen.`);

    for (const row of sheetData) {
      const productName = row['Produkt'];
      const productId = row['Produkt-ID'];
      const description = row['Beschreibung'] || '';
      const images = row['Bilder'] && row['Bilder'] !== 'n/a' ? row['Bilder'].split(', ') : [];
      const fachbereich = row['Fachbereich'] || 'n/a';
      const keyword = row['Suchschlüssel'] || 'n/a';
      const priceRaw = row['Preis pro Einheit'] || '';
      const currency = row['Währung'] || 'EUR';
      const taxBehavior = row['Steuerverhalten'] === 'Inklusive' ? 'inclusive' : row['Steuerverhalten'] === 'Exklusive' ? 'exclusive' : 'unspecified';
      const isDefaultPrice = row['Standardpreis'] === 'Ja';

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
            metadata: { fachbereich, keyword },
            active: true,
          });
          console.log(`♻️ Produkt aktualisiert (LIVE): ${productName} (${productId})`);
        } catch (err) {
          console.warn(`⚠️ Produkt ${productName} nicht gefunden, erstelle neu...`);
          product = await stripe.products.create({
            name: productName,
            description: description || undefined,
            images: images.length > 0 ? images : undefined,
            metadata: { fachbereich, keyword },
            active: true,
          });
          console.log(`🆕 Produkt erstellt (LIVE): ${productName} (${product.id})`);
        }
      } else {
        product = await stripe.products.create({
          name: productName,
          description: description || undefined,
          images: images.length > 0 ? images : undefined,
          metadata: { fachbereich, keyword },
          active: true,
        });
        console.log(`🆕 Produkt erstellt (LIVE): ${productName} (${product.id})`);
      }

      const prices = await stripe.prices.list({ product: product.id, limit: 50 });
      const matchingPrice = prices.data.find(p =>
        p.unit_amount === unitAmount &&
        p.currency.toLowerCase() === currency.toLowerCase() &&
        p.tax_behavior === taxBehavior
      );

      let priceId;
      if (!matchingPrice) {
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: currency.toLowerCase(),
          tax_behavior: taxBehavior,
          metadata: { fachbereich, keyword },
        });
        priceId = newPrice.id;
        console.log(`💵 Neuer Preis erstellt (LIVE) für ${productName}: ${priceId} (${(unitAmount / 100).toFixed(2)} ${currency})`);
      } else {
        priceId = matchingPrice.id;
        console.log(`✅ Preis bereits aktuell (LIVE) für ${productName}: ${priceId}`);
      }

      if (isDefaultPrice && product.default_price !== priceId) {
        await stripe.products.update(product.id, { default_price: priceId });
        console.log(`📌 Default-Preis gesetzt (LIVE) für ${productName}: ${priceId}`);
      }

      await wait(200);
    }

    console.log('🏁 Update abgeschlossen (LIVE)! Überprüfe im Live-Dashboard oder mit exportFullProductDataToExcel.js.');
  } catch (err) {
    console.error('❌ Fehler beim Update (LIVE):', err.message);
  }
}

async function runUpdate() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await updateStripeFromSheet(spreadsheetId);
}

runUpdate();