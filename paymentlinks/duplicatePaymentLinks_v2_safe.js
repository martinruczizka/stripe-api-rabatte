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
  console.log("📦 Lade alle Payment Links...");

  // Pagination laden
  let allLinks = [];
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const page = await stripe.paymentLinks.list({ limit: 100, starting_after: startingAfter });
    allLinks.push(...page.data);
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }

  console.log(`📎 ${allLinks.length} Payment Links geladen\n`);

  for (const link of allLinks) {
    try {
      const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
      const item = lineItems.data[0];
      if (!item) continue;

      const price = await stripe.prices.retrieve(item.price.id);
      const product = await stripe.products.retrieve(price.product);

      const key = discountMap[product.name];
      if (!key) continue;

      const allPrices = await stripe.prices.list({ product: product.id, active: true });
      const discountPrice = allPrices.data.find(p => p.lookup_key?.includes("50off"));
      if (!discountPrice) continue;

      // Prüfen, ob bereits ein 50%-Link existiert
      const existing50 = allLinks.find(
        l => l.metadata?.duplicated_from === link.id && l.metadata?.discount === "50%"
      );

      if (existing50) {
        // Update vorhandenen Link
        await stripe.paymentLinks.update(existing50.id, {
          line_items: [{ price: discountPrice.id, quantity: 1 }],
          after_completion: link.after_completion,
          automatic_tax: link.automatic_tax,
          allow_promotion_codes: false,
          metadata: { duplicated_from: link.id, discount: "50%" },
        });
        console.log(`🔁 Aktualisiert: ${product.name} (50 OFF) → ${existing50.url}`);
      } else {
        // Neu erstellen, falls keiner existiert
        const newLink = await stripe.paymentLinks.create({
          line_items: [{ price: discountPrice.id, quantity: 1 }],
          after_completion: link.after_completion,
          automatic_tax: link.automatic_tax,
          allow_promotion_codes: false,
          metadata: { duplicated_from: link.id, discount: "50%" },
        });
        console.log(`✅ Neu erstellt: ${product.name} (50 OFF) → ${newLink.url}`);
      }
    } catch (err) {
      console.error(`❌ Fehler bei Link: ${err.message}`);
    }
  }

  console.log("\n🎉 Fertig! Alle 50%-Payment Links wurden aktualisiert oder neu erstellt.");
}

duplicatePaymentLinks();
