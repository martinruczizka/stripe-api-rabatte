import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";
import csv from "csv-parser";

dotenv.config();

// ✅ Immer TEST-Key verwenden!
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST);

const csvPath = path.resolve("test-products.csv");

async function updateFachbereiche() {
  console.log("🚀 Starte Update der Fachbereiche in TEST-Umgebung\n");

  if (!fs.existsSync(csvPath)) {
    console.error("❌ Datei test-products.csv nicht gefunden!");
    process.exit(1);
  }

  const rows = [];
  const fachbereiche = {
    "Dipl. Mentaltraining": "Persönlichkeitsentwicklung",
    "Dipl. Mentaltraining (Test)": "Persönlichkeitsentwicklung",
    "Dipl. Kräuterpädagogik": "Natur- und Kräuterlehre",
    "Dipl. Ernährungstraining": "Ernährung und Wellness",
    "Dipl. Ayurvedisches Ernährungstraining": "Ernährung und Wellness",
    "Dipl. TCM Ernährungstraining": "Ernährung und Wellness",
    "Dipl. Natur- und Erlebnispädagogik": "Natur- und Kräuterlehre",
    "Dipl. Achtsamkeitstraining": "Persönlichkeitsentwicklung",
    "Dipl. Resilienztraining": "Persönlichkeitsentwicklung",
    "Dipl. Farbenergetik": "Energetik Exklusiv",
    "Dipl. Kinesiologie": "Energetik Exklusiv",
    "Dipl. Knospenkunde": "Natur- und Kräuterlehre",
    "Dipl. Aromaberatung": "Energetik Exklusiv",
    "Dipl. Bachblütenberatung": "Energetik Exklusiv",
    "Dipl. Klangenergetik": "Energetik Exklusiv",
    "Dipl. Tierenergetik": "Ganzheitliche Tiergesundheit",
    "Dipl. Bachblütenberatung für Hunde": "Ganzheitliche Tiergesundheit",
    "Vitalcoach für Pferde": "Ganzheitliche Tiergesundheit",
    "Vitalcoach für Hunde": "Ganzheitliche Tiergesundheit",
    "Vitalcoach für Katzen": "Ganzheitliche Tiergesundheit",
    "Basisvitalcoach für Tiere": "Ganzheitliche Tiergesundheit",
    "Dipl. Fachpraktikum für Shinrin Yoku (Waldbaden)": "Natur- und Kräuterlehre",
    "Dipl. Wildkräuter Praktikerin": "Natur- und Kräuterlehre",
    "Dipl. Praktikum für Schamanische Rituale": "Energetik Exklusiv",
    "Dipl. Ayurveda Kräuterspezialistin Ashwagandha": "Natur- und Kräuterlehre",
    "Dipl. Fachberatung für Räuchermischungen": "Energetik Exklusiv",
    "Dipl. Kräuterteeberatung für Stressabbau": "Natur- und Kräuterlehre",
    "Dipl. Feng Shui Pflanzenberatung für Innenräume": "Natur- und Kräuterlehre",
    "Dipl. Kräuterberatung Anbau Innenbereich": "Natur- und Kräuterlehre",
    "Dipl. Humanenergetik": "Energetik Exklusiv",
    "50 % Premium+ Gratis Kurs": "Persönlichkeitsentwicklung",
    "Dipl. Mentaltraining falsch": "Persönlichkeitsentwicklung",
  };

  // CSV-Datei Zeile für Zeile einlesen
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  let updated = 0;
  for (const row of rows) {
    const productId = row.id?.trim();
    const productName = row.Name?.trim();
    const fachbereich = fachbereiche[productName];

    if (!productId || !fachbereich) {
      console.log(`⚠️ Überspringe ${productName || "Unbekannt"} – kein Fachbereich gefunden.`);
      continue;
    }

    try {
      await stripe.products.update(productId, {
        metadata: { fachbereich },
      });
      console.log(`✅ ${productName} (${productId}) → ${fachbereich}`);
      updated++;
    } catch (err) {
      console.warn(`❌ Fehler bei ${productName}: ${err.message}`);
    }
  }

  console.log(`\n🏁 ${updated} Produkte erfolgreich aktualisiert.`);
}

updateFachbereiche().catch((err) => {
  console.error("❌ Fehler beim Update:", err.message);
});
