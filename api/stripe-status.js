import Stripe from "stripe";

export default async function handler(req, res) {
  try {
    // Prüfen, ob Test- und Live-Keys vorhanden sind
    const stripeLive = process.env.STRIPE_SECRET_KEY_LIVE
      ? new Stripe(process.env.STRIPE_SECRET_KEY_LIVE)
      : null;
    const stripeTest = process.env.STRIPE_SECRET_KEY_TEST
      ? new Stripe(process.env.STRIPE_SECRET_KEY_TEST)
      : null;

    const result = {
      env: process.env.VERCEL_ENV || "local",
      liveKey: stripeLive ? "✅ gefunden" : "❌ fehlt",
      testKey: stripeTest ? "✅ gefunden" : "❌ fehlt",
      accountLive: null,
      accountTest: null,
    };

    if (stripeLive) {
      try {
        const acc = await stripeLive.accounts.retrieve();
        result.accountLive = `✅ verbunden mit ${acc.email || acc.id}`;
      } catch (err) {
        result.accountLive = `❌ Fehler: ${err.message}`;
      }
    }

    if (stripeTest) {
      try {
        const acc = await stripeTest.accounts.retrieve();
        result.accountTest = `✅ verbunden mit ${acc.email || acc.id}`;
      } catch (err) {
        result.accountTest = `❌ Fehler: ${err.message}`;
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
