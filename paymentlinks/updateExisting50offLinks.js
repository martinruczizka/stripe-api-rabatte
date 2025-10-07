import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

// 50%-Mapping laut Martins Tabelle
const discountMap = {
  "Dipl. Humanenergetik": "humanenergetiker_50off",
  "Dipl. Tierenergetik": "tierenergetiker_50off",
  "Dipl. Mentaltraining": "mentaltrainer_50off",
  "Dipl. Ernährungstraining": "ernaehrungstrainer_50off",
  "Dipl. Kräuterpädagogik": "kraeuterpaedagoge_50off",
  "Dipl. Natur- und Erlebnispädagogik": "naturunderlebnispaedagoge_50off",
  "Dipl. Achtsamkeitstraining": "achtsamkeitstrainer_50off",
  "Dipl. Resilienztraining": "resilienztrainer_50off",
  "Dipl. Farbenergetik": "farbtherapie_50off",
  "Dipl. Kinesiologie": "kinesiologie_50off",
  "Dipl. Knospenkunde": "knospenkunde_50off",
  "Dipl. Aromaberatung": "aromaberater_50off",
  "Dipl. Bachblütenberatung": "bachbluetenberater_50off",
  "Dipl. Klangenergetik": "klangenergetiker_50off",
  "Dipl. Bachblütenberatung für Hunde": "bachbluetenhunde_50off",
  "Basisvtialcoach für Tiere": "tierenergetiker-basis_50off",
  "Vitalcoach für Katzen": "tierenergetiker-katze_50off",
  "Vitalcoach für Hunde": "tierenergetiker-hund_50off",
  "Vitalcoach für Pferde": "tierenergetiker-pferd_50off",
  "Dipl. Fachpraktikum für Shinrin Yoku (Waldbaden)": "fachpraktikum-shinrin-yoku_50off",
  "Dipl. Wildkräuter Praktikerin": "wildkraeuter-praktiker_50off",
  "Dipl. Praktikum für Schamanische Rituale": "schamanische-rituale_50off",
  "Dipl. TCM Ernährungstraining": "tcm-ernaehrungstraining_50off",
  "Dipl. Ayurvedisches Ernährungstraining": "ayurveda-ernaehrungstraining_50off",
  "Dipl. Fachberatung für Räuchermischungen": "fachberater-raeuchermischungen_50off",
  "Dipl. Ayurveda Kräuterspezialistin Ashwagandha": "ayurveda-kraueterspezialist_50off",
  "Dipl. Kräuterteeberatung für Stressabbau": "kraeuterteeberater_50off",
  "Dipl. Feng Shui Pflanzenberatung für Innenräume": "feng-shui-pflanzenberatung_50off",
  "Dipl. Kräuterberatung Anbau Innenbereich": "kraeuterberater-anbau-innen_50off"
};

async function updateOrCreate50Links() {
  console.log("💾 Backup & Update-Prozess gestartet...");

  // Backup erstellen
  const allLinks = await stripe.paymentLinks.list({ limit: 100 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `backups/paymentlinks_full_backup_${timestamp}.json`;
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(backupFile, JSON.stringify(allLinks.data, null, 2));
  console.log(`✅ Backup gespeichert unter ${backupFile}`);

  // Schleife über alle Payment Links
  for (const link of allLinks.data) {
    const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
    const item = lineItems.data[0];
    if (!item) continue;

    const price = await stripe.prices.retrieve(item.price.id);
    const product = await stripe.products.retrieve(price.product);

    const key = discountMap[product.name];
    if (!key) continue; // nur Produkte mit 50%-Mapping bearbeiten

    const allPrices = await stripe.prices.list({ product: product.id, active: true });
    const discountPrice = allPrices.data.find(p => p.lookup_key?.includes("50off"));
    if (!discountPrice) {
      console.log(`⚠️ Kein 50%-Preis für ${product.name} gefunden.`);
      continue;
    }

    try {
      // Prüfen, ob bereits ein 50%-Link existiert
      const existing = allLinks.data.find(l =>
        l.metadata?.discount === "50%" && l.metadata?.duplicated_from === link.id
      );

      const baseData = {
        after_completion: {
          type: "redirect",
          redirect: {
            url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
          },
        },
        allow_promotion_codes: false,
        invoice_creation: { enabled: true },
        automatic_tax: link.automatic_tax,
        custom_text: link.custom_text,
        custom_fields: link.custom_fields,
        shipping_options: link.shipping_options,
        metadata: {
          duplicated_from: link.id,
          discount: "50%",
          copied_from_name: product.name,
          updated_at: new Date().toISOString(),
        },
      };

      if (existing) {
        await stripe.paymentLinks.update(existing.id, {
          ...baseData,
          line_items: [{ price: discountPrice.id, quantity: 1 }],
        });
        console.log(`🔁 Aktualisiert: ${product.name} → ${existing.url}`);
      } else {
        const newLink = await stripe.paymentLinks.create({
          ...baseData,
          line_items: [{ price: discountPrice.id, quantity: 1 }],
        });
        console.log(`✅ Neu erstellt: ${product.name} → ${newLink.url}`);
      }
    } catch (err) {
      console.error(`❌ Fehler bei ${product.name}: ${err.message}`);
    }
  }

  console.log("\n🎉 Alle 50%-Paymentlinks wurden aktualisiert oder neu erstellt!");
}

updateOrCreate50Links();
