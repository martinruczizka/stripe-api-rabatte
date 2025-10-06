/**
 * createMentaltrainerTest.js
 * Erzeugt Payment Link für "Dipl. Mentaltraining (Test)"
 * mit optionalen Posten, Rechnungsstellung aktiv, ohne Gutscheine.
 */

import dotenv from "dotenv";
import Stripe from "stripe";

// .env laden
dotenv.config();

// Stripe-Instanz initialisieren
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    const product = await stripe.products.create({
      name: "Dipl. Mentaltraining (Test)",
      metadata: { lookup_key: "mentaltrainer_test" },
    });

    const price = await stripe.prices.create({
      unit_amount: 174900,
      currency: "eur",
      product: product.id,
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: false,
      invoice_creation: { enabled: true },

      custom_fields: [
        {
          key: "zusatzpaket",
          label: { type: "custom", custom: "Zusatzoptionen auswählen" },
          type: "dropdown",
          dropdown: {
            options: [
              { label: "Keine Zusatzoption", value: "none" },
              { label: "Lehrmappe +79 €", value: "lehrmappe" },
              { label: "Printdiplom +49 €", value: "printdiplom" },
            ],
          },
        },
      ],

      after_completion: {
        type: "redirect",
        redirect: {
          url: "https://www.institut-sitya.at/dankesseite-bestellung?session_id={CHECKOUT_SESSION_ID}",
        },
      },

      metadata: {
        kurs: "Dipl. Mentaltraining (Test)",
        lookup_key: "mentaltrainer_test",
      },
    });

    console.log("\n✅ Neuer Paymentlink erstellt:");
    console.log(link.url);
  } catch (error) {
    console.error("\n❌ Fehler beim Erstellen:", error.message);
  }
})();
