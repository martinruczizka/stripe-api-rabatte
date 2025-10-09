/**
 *  * redirect-paymentlinks.js
  * --------------------------------------------------------
   * Universeller Redirect-Endpunkt für Paymentlinks (absolut)
    * Beispiel:
     * https://checkout.institut-sitya.at/api/redirect-paymentlinks?fernlehrgang=humanenergetiker
      *
       * Leitet automatisch auf den passenden Stripe-Paymentlink weiter.
        * Sicher: kein Zugriff auf API-Keys oder .env nötig.
         */

         export default async function handler(req, res) {
           try {
               const { fernlehrgang } = req.query;

                   if (!fernlehrgang) {
                         return res.status(400).json({ error: "Parameter ?fernlehrgang= fehlt." });
                             }

                                 // 🔗 Zuordnung: Kurs → Paymentlink (absolute URLs)
                                     const paymentLinks = {
                                           humanenergetiker: "https://checkout.institut-sitya.at/b/bJe14meu281T6dt5BV0x204",
                                                 // Beispiel-Erweiterungen:
                                                       // aromaberater: "https://checkout.institut-sitya.at/b/bJe99xyz...",
                                                             // bachbluetenberater: "https://checkout.institut-sitya.at/b/bJe77abc...",
                                                                 };

                                                                     const kursKey = fernlehrgang.toLowerCase();
                                                                         const redirectUrl = paymentLinks[kursKey];

                                                                             if (!redirectUrl) {
                                                                                   return res.status(404).json({ error: `Kein Paymentlink für '${fernlehrgang}' gefunden.` });
                                                                                       }

                                                                                           console.log(`➡️ Redirect zu ${redirectUrl}`);

                                                                                               // ✅ Absolute Weiterleitung
                                                                                                   res.writeHead(302, { Location: redirectUrl });
                                                                                                       res.end();
                                                                                                         } catch (error) {
                                                                                                             console.error("❌ Fehler beim Redirect:", error.message);
                                                                                                                 res.status(500).json({ error: "Interner Fehler beim Redirect." });
                                                                                                                   }
                                                                                                                   }
                                                                                                                   
 */