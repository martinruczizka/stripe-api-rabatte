import 'dotenv/config';
import Stripe from 'stripe';
import XLSX from 'xlsx';

// =============================================================
// 📦 STRIPE FULL PRODUCT DATA EXPORT
// Alle Produkte + alle Preise + vollständige Parameter
// =============================================================

const stripeKey =
  process.env.STRIPE_SECRET_KEY_LIVE ||
  process.env.STRIPE_SECRET_KEY_TEST ||
  process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ Kein Stripe-Key gefunden! Prüfe .env oder Vercel.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
console.log(`🔑 Verwende Key: ${stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST'}`);

// 🕐 kleine Pause, um Rate Limits zu vermeiden
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================
// 🧩 Produkte und alle zugehörigen Preise abrufen
// =============================================================
const fetchFullProductData = async () => {
  const allProducts = [];
  let hasMore = true;
  let startingAfter = null;

  console.log("📥 Produkte werden geladen...");

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
        Link: `https://dashboard.stripe.com/products/${product.id}`,
        Produkt: product.name,
        'Produkt-ID': product.id,
        'Preis pro Einheit': 'n/a',
        'Preis-ID': 'n/a',
        Suchschlüssel: product.metadata?.keyword || 'n/a',
        Währung: 'n/a',
        Intervall: 'Einmalig',
        'Steuerverhalten': 'n/a',
        Standardpreis: 'Nein',
        'Erstellt am': new Date(product.created * 1000).toLocaleString('de-DE'),
        'API-Log': '200 OK – GET /v1/products',
      });
    } else {
      for (const price of prices.data) {
        rows.push({
          Link: `https://dashboard.stripe.com/products/${product.id}`,
          Produkt: product.name,
          'Produkt-ID': product.id,
          'Preis pro Einheit': price.unit_amount
            ? (price.unit_amount / 100).toLocaleString('de-DE', {
                style: 'currency',
                currency: price.currency.toUpperCase(),
              })
            : 'n/a',
          'Preis-ID': price.id,
          Suchschlüssel: product.metadata?.keyword || 'n/a',
          Währung: price.currency.toUpperCase(),
          Intervall: price.recurring?.interval || 'Einmalig',
          'Steuerverhalten':
            price.tax_behavior === 'exclusive' ? 'Exklusive' : 'Inklusive',
          Standardpreis: product.default_price === price.id ? 'Ja' : 'Nein',
          'Erstellt am': new Date(price.created * 1000).toLocaleString('de-DE'),
          'API-Log': '200 OK – GET /v1/prices',
        });
      }
    }
  }

  return rows;
};

// =============================================================
// 💾 Excel-Datei schreiben
// =============================================================
const exportToExcel = async () => {
  try {
    const data = await fetchFullProductData();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Full Product Data');

    const fileName = 'export_full_product_data.xlsx';
    XLSX.writeFile(wb, fileName);

    console.log(`✅ ${fileName} erfolgreich erstellt!`);
  } catch (err) {
    console.error('❌ Fehler beim Export:', err.message);
  }
};

exportToExcel();
