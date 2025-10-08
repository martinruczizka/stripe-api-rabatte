// /workspaces/stripe-product-mapper/pages/api/optional-create-sessionTest.js
import Stripe from 'stripe';
import { optionalItemsMapTests } from '../../src/utils/optional-items-MapTests.js';

const KEYS_MAP = {
  'prod_TBx6SiknnBM7SQ': 'aromaberater',
  'prod_TBx6fHVSi1cO0c': 'bachbluetenberater',
  'prod_TBx6EkQidwn3Ze': 'fachberater-raeuchermischungen',
  'prod_TBx6XCAkvirUWI': 'farbtherapie',
  'prod_TBx60WNkX2qt5H': 'feng-shui-pflanzenberatung',
  'prod_T9megpJzxDa3Hw': 'humanenergetiker',
  'prod_TBx6SvkJvo12PE': 'kinesiologie',
  'prod_TBx6DVd8qgxg3z': 'klangenergetiker',
  'prod_TBx6Rd44XDkvQ2': 'schamanische-rituale',
  'prod_TBx6gKGstmXFjN': 'ayurveda-ernaehrungstraining',
  'prod_TACoUJJ1WJKMI1': 'ernaehrungstrainer',
  'prod_TBx6UUW8DhCkkY': 'tcm-ernaehrungstraining',
  'prod_TBx6QCmf5OGik4': 'tierenergetiker-basis',
  'prod_T9mfwA0CMVlc91': 'tierenergetiker',
  'prod_TBx6wwFiSk6ixQ': 'tierenergetiker-hund',
  'prod_TBx6BwNNgWxG3k': 'tierenergetiker-katze',
  'prod_TBx6hVadtfAtfq': 'tierenergetiker-pferd',
  'prod_TBx6cgYV9s8Jlw': 'bachbluetenhunde',
  'prod_TBx6b9BrnlYu58': 'ayurveda-kraueterspezialist',
  'prod_TBx6jPYSLUYbKj': 'knospenkunde',
  'prod_TBx6u1wAULwWNN': 'kraeuterberater-anbau-innen',
  'prod_TACo4pE4TC10Si': 'kraeuterpaedagoge',
  'prod_TBx6h64dhmeWmg': 'kraeuterteeberater',
  'prod_TBx6QaLGnvT6Iq': 'wildkraeuter-praktiker',
  'prod_TBx6EZTh4KgTqh': 'achtsamkeitstrainer',
  'prod_TBx6oIb6F3Eg5C': 'fachpraktikum-shinrin-yoku',
  'prod_T9mgUomiUhdbCi': 'mentaltrainer',
  'prod_TBx7xGNMTXSduF': 'naturunderlebnispaedagoge',
  'prod_TBx6VmlBefkCDm': 'resilienztrainer',
};

const PRICE_MAP = {
  'aromaberater': 'price_1SFxDfAYh6QHq4iY3zSLQHYl',
  'bachbluetenberater': 'price_1SFxDiAYh6QHq4iYjXx9zGFF',
  'humanenergetiker': 'price_1SFfUlAYh6QHq4iYcEZnN8La',
  'kinesiologie': 'price_1SFfUsAYh6QHq4iYG36WngUx',
  'farbtherapie': 'price_1SFfUYAYh6QHq4iYSw9GFTAD',
  'klangenergetiker': 'price_1SFfUxAYh6QHq4iY85FVP3FT',
  'ayurveda-ernaehrungstraining': 'price_1SFfTyAYh6QHq4iYuDMUCrZM',
  'tcm-ernaehrungstraining': 'price_1SFfVxAYh6QHq4iY3wdl0Owt',
  'ernaehrungstrainer': 'price_1SFfUGAYh6QHq4iYpigDW2yR',
  'tierenergetiker-katze': 'price_1SFfWNAYh6QHq4iYEibYVgmi',
  'tierenergetiker-hund': 'price_1SFfWIAYh6QHq4iYSr7WtIdV',
  'tierenergetiker-pferd': 'price_1SFfWSAYh6QHq4iYYV1HrYaE',
  'tierenergetiker-basis': 'price_1SFfTcAYh6QHq4iY7tV8Z5Wg',
  'tierenergetiker': 'price_1SFfW5AYh6QHq4iYpg5XSdEf',
  'ayurveda-kraueterspezialist': 'price_1SFfV2AYh6QHq4iYk51KxYNN',
  'kraeuterteeberater': 'price_1SFfVNAYh6QHq4iYea00TEz1',
  'wildkraeuter-praktiker': 'price_1SFfVAAYh6QHq4iYbfsrX6lx',
  'kraeuterberater-anbau-innen': 'price_1SFfWBAYh6QHq4iYhbhq72h3',
  'kraeuterpaedagoge': 'price_1SFfVIAYh6QHq4iY4ZUMG6uQ',
  'knospenkunde': 'price_1SFfTrAYh6QHq4iYrODnuiJ5',
  'mentaltrainer': 'price_1SFfThAYh6QHq4iYb6hYELPl',
  'achtsamkeitstrainer': 'price_1SFfVSAYh6QHq4iYQqVJMOmq',
  'resilienztrainer': 'price_1SFfVrAYh6QHq4iYQnjMiy6W',
  'naturunderlebnispaedagoge': 'price_1SFfVhAYh6QHq4iYn7an5eTW',
  'fachpraktikum-shinrin-yoku': 'price_1SFhNtAYh6QHq4iYrmlSTbyn',
};

export default async function handler(req, res) {
  try {
    console.log('Starting optional-create-sessionTest handler with query:', req.query);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST, { apiVersion: '2025-03-31' });
    const { kurs, rabatt } = req.query;

    if (!kurs) {
      console.error('Missing kurs parameter');
      return res.status(400).json({ error: 'Fehlender Parameter ?kurs=' });
    }

    const priceId = PRICE_MAP[kurs.toLowerCase()];
    if (!priceId) {
      console.error(`Unknown kurs: ${kurs}`);
      return res.status(404).json({ error: `Unbekannter Kurs: ${kurs}` });
    }

    console.log(`Found priceId: ${priceId} for kurs: ${kurs}`);
    const productId = Object.keys(KEYS_MAP).find(id => KEYS_MAP[id] === kurs.toLowerCase());
    console.log(`Found productId: ${productId}`);
    const optionalProductIds = optionalItemsMapTests[productId] || [];
    console.log(`Optional product IDs: ${optionalProductIds}`);

    const optionalItems = [];
    for (const optProductId of optionalProductIds) {
      console.log(`Fetching price for optional product: ${optProductId}`);
      const prices = await stripe.prices.list({ product: optProductId, active: true, limit: 1 });
      console.log(`Price response for ${optProductId}:`, prices.data);
      if (prices.data.length > 0) {
        optionalItems.push({
          price: prices.data[0].id,
          quantity: 1,
        });
      }
    }
    console.log(`Optional items:`, optionalItems);

    let promoId = null;
    if (rabatt) {
      console.log(`Checking promotion code: ${rabatt.toUpperCase()}`);
      const promos = await stripe.promotionCodes.list({ code: rabatt.toUpperCase(), active: true });
      console.log(`Promotion codes response:`, promos.data);
      if (promos.data.length > 0) {
        promoId = promos.data[0].id;
      } else {
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: 'once',
        });
        console.log(`Created coupon: ${coupon.id}`);
        const promo = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: rabatt.toUpperCase(),
          expires_at: Math.floor(new Date('2025-10-08T23:59:59Z').getTime() / 1000),
        });
        promoId = promo.id;
        console.log(`🕐 Neuer zeitbegrenzter Promotion Code erstellt: ${promo.code}`);
      }
    }

    console.log(`Creating checkout session with priceId: ${priceId}, promoId: ${promoId}`);
    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: priceId, quantity: 1 },
      ],
      optional_items: optionalItems,
      mode: 'payment',
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      invoice_creation: { enabled: true },
      discounts: promoId ? [{ promotion_code: promoId }] : [],
      allow_promotion_codes: rabatt ? true : false,
      metadata: { kurs, rabatt: rabatt || 'none' },
    });
    console.log(`Checkout session created: ${session.url}`);

    return res.status(200).json({
      success: true,
      kurs,
      rabatt: rabatt || null,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    return res.status(500).json({ error: error.message });
  }
}