import 'dotenv/config';
import Stripe from 'stripe';
import XLSX from 'xlsx';
import fs from 'fs';

// 🧩 1️⃣ Stripe-Key automatisch wählen
const stripeKey =
  process.env.STRIPE_SECRET_KEY_LIVE ||
  process.env.STRIPE_SECRET_KEY_TEST ||
  process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ Kein Stripe-Key gefunden! Prüfe .env oder Vercel.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
console.log(
  `🔑 Verwende Key: ${stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST'}`
);

// 🕐 Hilfsfunktion: Delay zwischen Requests
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🧾 2️⃣ Produkte + Preise abrufen (mit Throttling)
const fetchStripeProducts = async () => {
  const products = await stripe.products.list({ limit: 100 });
  const rows = [];

  for (const p of products.data) {
    try {
      const priceId = p.default_price?.id;
      let priceData = null;

      if (priceId) {
        // kleine Pause, um Rate Limit zu vermeiden
        await wait(150); // 150 ms zwischen Preisabrufen
        priceData = await stripe.prices.retrieve(priceId);
      }

      rows.push({
        Produkt: p.name,
        'Preis pro Einheit': priceData
          ? (priceData.unit_amount / 100).toLocaleString('de-DE', {
              style: 'currency',
              currency: priceData.currency.toUpperCase(),
            })
          : 'n/a',
        Suchschlüssel: p.metadata?.keyword || 'n/a',
        Währung: priceData ? priceData.currency.toUpperCase() : 'EUR',
        Intervall: priceData?.recurring?.interval || 'Einmalig',
        'Steuerverhalten':
          priceData?.tax_behavior === 'exclusive' ? 'Exklusive' : 'Inklusive',
        Standardpreis: priceData?.active ? 'Ja' : 'Nein',
        'Erstellt am': new Date(p.created * 1000).toLocaleString('de-DE'),
        'API-Log': '200 OK – GET /v1/products',
        'Preis-ID': priceId || 'n/a',
      });
    } catch (err) {
      console.error(`⚠️ Fehler bei Produkt ${p.name}:`, err.message);
      rows.push({
        Produkt: p.name,
        'Preis pro Einheit': 'n/a',
        Suchschlüssel: 'n/a',
        Währung: 'n/a',
        Intervall: 'n/a',
        'Steuerverhalten': 'n/a',
        Standardpreis: 'n/a',
        'Erstellt am': new Date(p.created * 1000).toLocaleString('de-DE'),
        'API-Log': 'Rate limit fallback',
        'Preis-ID': 'n/a',
      });
    }
  }

  return rows;
};

// 💾 3️⃣ Excel schreiben
const exportToExcel = async () => {
  try {
    const data = await fetchStripeProducts();

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Produkte');

    XLSX.writeFile(wb, 'export.xlsx');
    console.log('✅ Excel-Datei export.xlsx erfolgreich erstellt!');
  } catch (err) {
    console.error('❌ Fehler beim Export:', err.message);
  }
};

exportToExcel();
