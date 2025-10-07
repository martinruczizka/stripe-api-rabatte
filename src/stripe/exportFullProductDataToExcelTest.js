// src/stripe/exportFullProductDataToExcelTest.js
import 'dotenv/config';
import Stripe from 'stripe';
import ExcelJS from 'exceljs';

const stripeKey = process.env.STRIPE_SECRET_KEY_TEST;
if (!stripeKey) {
  console.error('❌ Kein Stripe Test-Key gefunden! Prüfe .env.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: ${stripeKey.startsWith('sk_test') ? 'TEST' : 'ERROR'}`);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchFullProductData = async () => {
  const allProducts = [];
  let hasMore = true;
  let startingAfter = null;

  console.log('📥 Produkte werden aus TEST geladen...');

  while (hasMore) {
    const response = await stripe.products.list({
      limit: 50,
      starting_after: startingAfter || undefined,
    });
    allProducts.push(...response.data);
    hasMore = response.has_more;
    if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    await wait(200);
  }

  console.log(`✅ ${allProducts.length} Produkte gefunden.`);

  const rows = [];
  for (const product of allProducts) {
    const prices = await stripe.prices.list({ product: product.id, limit: 50 });
    await wait(150);

    if (prices.data.length === 0) {
      rows.push({
        Link: `https://dashboard.stripe.com/test/products/${product.id}`,
        Produkt: product.name,
        'Produkt-ID': product.id,
        'Preis pro Einheit': 'n/a',
        'Preis-ID': 'n/a',
        Fachbereich: product.metadata?.fachbereich || 'n/a',
        Suchschlüssel: product.metadata?.keyword || 'n/a',
        Währung: 'n/a',
        Intervall: 'Einmalig',
        Steuerverhalten: 'n/a',
        Standardpreis: 'Nein',
        'Erstellt am': new Date(product.created * 1000).toLocaleString('de-DE'),
        'API-Log': '200 OK – GET /v1/products',
        Bilder: product.images?.length > 0 ? product.images.join(', ') : 'n/a',
        Beschreibung: product.description || 'n/a',
      });
    } else {
      for (const price of prices.data) {
        rows.push({
          Link: `https://dashboard.stripe.com/test/products/${product.id}`,
          Produkt: product.name,
          'Produkt-ID': product.id,
          'Preis pro Einheit': price.unit_amount
            ? (price.unit_amount / 100).toLocaleString('de-DE', {
                style: 'currency',
                currency: price.currency.toUpperCase(),
              })
            : 'n/a',
          'Preis-ID': price.id,
          Fachbereich: product.metadata?.fachbereich || 'n/a',
          Suchschlüssel: product.metadata?.keyword || 'n/a',
          Währung: price.currency.toUpperCase(),
          Intervall: price.recurring?.interval || 'Einmalig',
          Steuerverhalten: price.tax_behavior === 'exclusive' ? 'Exklusive' : 'Inklusive',
          Standardpreis: product.default_price === price.id ? 'Ja' : 'Nein',
          'Erstellt am': new Date(price.created * 1000).toLocaleString('de-DE'),
          'API-Log': '200 OK – GET /v1/prices',
          Bilder: product.images?.length > 0 ? product.images.join(', ') : 'n/a',
          Beschreibung: product.description || 'n/a',
        });
      }
    }
  }
  return rows;
};

const exportToExcel = async () => {
  try {
    const data = await fetchFullProductData();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Full Product Data');

    worksheet.columns = [
      { header: 'Link', key: 'Link', width: 50 },
      { header: 'Produkt', key: 'Produkt', width: 40 },
      { header: 'Produkt-ID', key: 'Produkt-ID', width: 25 },
      { header: 'Preis pro Einheit', key: 'Preis pro Einheit', width: 15 },
      { header: 'Preis-ID', key: 'Preis-ID', width: 25 },
      { header: 'Fachbereich', key: 'Fachbereich', width: 20 },
      { header: 'Suchschlüssel', key: 'Suchschlüssel', width: 20 },
      { header: 'Währung', key: 'Währung', width: 10 },
      { header: 'Intervall', key: 'Intervall', width: 10 },
      { header: 'Steuerverhalten', key: 'Steuerverhalten', width: 15 },
      { header: 'Standardpreis', key: 'Standardpreis', width: 10 },
      { header: 'Erstellt am', key: 'Erstellt am', width: 20 },
      { header: 'API-Log', key: 'API-Log', width: 20 },
      { header: 'Bilder', key: 'Bilder', width: 30 },
      { header: 'Beschreibung', key: 'Beschreibung', width: 50 },
    ];

    worksheet.addRows(data);

    const fileName = 'export_full_product_data_test.xlsx';
    await workbook.xlsx.writeFile(fileName);
    console.log(`✅ ${fileName} erfolgreich erstellt!`);
  } catch (err) {
    console.error('❌ Fehler beim Export:', err.message);
  }
};

exportToExcel();