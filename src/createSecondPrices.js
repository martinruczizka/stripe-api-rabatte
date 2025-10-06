import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
);

// 🗂️ Deine Kursdaten (Name, 50%-Preis, Lookup-Key)
const kursDaten = [
  { name: "Dipl. Humanenergetik", price: 1124.5, key: "humanenergetiker_50off" },
  { name: "Dipl. Tierenergetik", price: 1124.5, key: "tierenergetiker_50off" },
  { name: "Dipl. Mentaltraining", price: 874.5, key: "mentaltrainer_50off" },
  { name: "Dipl. Ernährungstraining", price: 874.5, key: "ernaehrungstrainer_50off" },
  { name: "Dipl. Kräuterpädagogik", price: 874.5, key: "kraeuterpaedagoge_50off" },
  { name: "Dipl. Natur- und Erlebnispädagogik", price: 874.5, key: "naturunderlebnispaedagoge_50off" },
  { name: "Dipl. Achtsamkeitstraining", price: 874.5, key: "achtsamkeitstrainer_50off" },
  { name: "Dipl. Resilienztraining", price: 874.5, key: "resilienztrainer_50off" },
  { name: "Dipl. Farbenergetik", price: 874.5, key: "farbtherapie_50off" },
  { name: "Dipl. Kinesiologie", price: 874.5, key: "kinesiologie_50off" },
  { name: "Dipl. Knospenkunde", price: 874.5, key: "knospenkunde_50off" },
  { name: "Dipl. Aromaberatung", price: 324.5, key: "aromaberater_50off" },
  { name: "Dipl. Bachblütenberatung", price: 324.5, key: "bachbluetenberater_50off" },
  { name: "Dipl. Klangenergetik", price: 324.5, key: "klangenergetiker_50off" },
  { name: "Dipl. Bachblütenberatung für Hunde", price: 324.5, key: "bachbluetenhunde_50off" },
  { name: "Basisvtialcoach für Tiere", price: 324.5, key: "tierenergetiker-basis_50off" },
  { name: "Vitalcoach für Katzen", price: 324.5, key: "tierenergetiker-katze_50off" },
  { name: "Vitalcoach für Hunde", price: 324.5, key: "tierenergetiker-hund_50off" },
  { name: "Vitalcoach für Pferde", price: 324.5, key: "tierenergetiker-pferd_50off" },
  { name: "Dipl. Fachpraktikum für Shinrin Yoku (Waldbaden)", price: 174.5, key: "fachpraktikum-shinrin-yoku_50off" },
  { name: "Dipl. Wildkräuter Praktikerin", price: 174.5, key: "wildkraeuter-praktiker_50off" },
  { name: "Dipl. Praktikum für Schamanische Rituale", price: 174.5, key: "schamanische-rituale_50off" },
  { name: "Dipl. TCM Ernährungstraining", price: 174.5, key: "tcm-ernaehrungstraining_50off" },
  { name: "Dipl. Ayurvedisches Ernährungstraining", price: 174.5, key: "ayurveda-ernaehrungstraining_50off" },
  { name: "Dipl. Fachberatung für Räuchermischungen", price: 174.5, key: "fachberater-raeuchermischungen_50off" },
  { name: "Dipl. Ayurveda Kräuterspezialistin Ashwagandha", price: 174.5, key: "ayurveda-kraueterspezialist_50off" },
  { name: "Dipl. Kräuterteeberatung für Stressabbau", price: 174.5, key: "kraeuterteeberater_50off" },
  { name: "Dipl. Feng Shui Pflanzenberatung für Innenräume", price: 174.5, key: "feng-shui-pflanzenberatung_50off" },
  { name: "Dipl. Kräuterberatung Anbau Innenbereich", price: 174.5, key: "kraeuterberater-anbau-innen_50off" },
];

(async () => {
  try {
    const allProducts = await stripe.products.list({ limit: 100, active: true });
    console.log(`🔍 ${allProducts.data.length} aktive Produkte gefunden\n`);

    for (const kurs of kursDaten) {
      const match = allProducts.data.find((p) => p.name.trim() === kurs.name.trim());
      if (!match) {
        console.warn(`⚠️ Kein Produkt gefunden für: ${kurs.name}`);
        continue;
      }

      // Prüfen, ob Preis mit Lookup-Key schon existiert
      const existingPrices = await stripe.prices.list({
        product: match.id,
        lookup_keys: [kurs.key],
        active: true,
      });

      if (existingPrices.data.length > 0) {
        console.log(`✅ Preis für "${kurs.name}" (${kurs.key}) existiert bereits.`);
        continue;
      }

      // Wenn nicht vorhanden → neuen Preis anlegen
      const newPrice = await stripe.prices.create({
        product: match.id,
        unit_amount: Math.round(kurs.price * 100), // Euro → Cent
        currency: "eur",
        lookup_key: kurs.key,
        active: true,
      });

      console.log(`💰 Neuer Preis erstellt für "${kurs.name}": ${kurs.price} € (${newPrice.id})`);
    }

    console.log("\n🎉 Fertig! Alle fehlenden Preise wurden erstellt.");
  } catch (err) {
    console.error("❌ Fehler:", err.message);
  }
})();
