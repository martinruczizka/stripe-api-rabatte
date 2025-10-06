// src/duplicatePaymentLinks.js
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

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

async function duplicatePaymentLinks() {
  console.log("🔍 Lade bestehende Payment Links...");

  const allLinks = await stripe.paymentLinks.list({ limit: 100 });
  console.log(`📎 ${allLinks.data.length} Payment Links gefunden\n`);

  for (const link of allLinks.data) {
    try {
      const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
      const item = lineItems.data[0];
      if (!item) {
        console.warn(`⚠️ Keine Line Items in Link ${link.id}, übersprungen`);
        continue;
      }

      const price = await stripe.prices.retrieve(item.price.id);
      const product = await stripe.products.retrieve(price.product);

      const key = discountMap[product.name];
      if (!key) {
        console.warn(`⚠️ Kein Mapping-Key gefunden für ${product.name}`);
        continue;
      }

      const allPrices = await stripe.prices.list({ product: product.id, active: true });
      const discountPrice = allPrices.data.find(p => p.lookup_key?.includes("50off"));
      if (!discountPrice) {
        console.warn(`⚠️ Kein 50%-Preis mit Lookup-Key "${key}" gefunden für ${product.name}`);
        continue;
      }

      // Sicherstellen, dass kein leerer Custom-Text übernommen wird
      const safeAfterCompletion = link.after_completion?.type === "hosted_confirmation"
        ? {
            type: "hosted_confirmation",
            hosted_confirmation: {
              custom_message: link.after_completion?.hosted_confirmation?.custom_message || undefined,
            },
          }
        : link.after_completion;

      const newLink = await stripe.paymentLinks.create({
        line_items: [{ price: discountPrice.id, quantity: 1 }],
        after_completion: safeAfterCompletion,
        metadata: { duplicated_from: link.id, discount: "50%" },
        allow_promotion_codes: false, // ❌ Keine weiteren Rabattcodes
        automatic_tax: link.automatic_tax,
        invoice_creation: { enabled: true }, // 🧾 Rechnung immer aktivieren
        ...(link.shipping_address_collection && { shipping_address_collection: link.shipping_address_collection }),
        ...(link.custom_fields && link.custom_fields.length > 0 && { custom_fields: link.custom_fields }),
        ...(link.custom_text && { custom_text: link.custom_text }),
        ...(link.consent_collection && { consent_collection: link.consent_collection }),
      });

      console.log(`✅ Neu erstellt: ${product.name} (50 OFF) → ${newLink.url}`);
    } catch (err) {
      console.error(`❌ Fehler bei ${link.id}:`, err.message);
    }
  }

  console.log("\n🎉 Fertig! Alle verfügbaren 50%-Payment Links wurden erstellt.");
}

duplicatePaymentLinks();
