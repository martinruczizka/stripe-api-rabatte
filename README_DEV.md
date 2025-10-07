# 🧭 README_DEV.md – Stripe Product Mapper

Projekt: **stripe-product-mapper**  
Zweck: Verwaltung, Export, Import und Synchronisierung von Stripe-Produkten, Preisen und Kursdaten mit Google Sheets.  
Autor: **Martin Ruczizka**

---

## 🚀 Schnellstart

**1. Test-Verbindung zur Google Sheets API prüfen**
```bash
node --env-file=.env src/sheets/testGoogleSheetsConnection.js
2. Stripe-Produkte exportieren (TEST)

bash
Code kopieren
node --env-file=.env src/stripe/exportFullProductDataToExcelTest.js
3. Stripe-Produkte exportieren (LIVE)

bash
Code kopieren
node --env-file=.env src/stripe/exportFullProductDataToExcel.js
4. Google Sheet → Stripe synchronisieren

bash
Code kopieren
node --env-file=.env src/sheets/updateStripeFromGoogleSheet.js
5. Vollständige Produktliste prüfen

bash
Code kopieren
node --env-file=.env src/stripe/listProducts.js
📦 Projektstruktur
bash
Code kopieren
stripe-product-mapper/
│
├─ .env                         # Enthält STRIPE & GOOGLE API Keys
├─ .gitignore                   # Schützt .env, Backups etc.
├─ package.json                 # Projektkonfiguration
├─ google-credentials.json      # Google Service Account Key
│
├─ /api                         # Produktive API-Endpoints
│   ├─ create-session.js
│   └─ redirect.js
│
├─ /backups                     # Automatische & manuelle Sicherungen
│   ├─ export_full_product_data.xlsx
│   ├─ export_full_product_data_test.xlsx
│   └─ backupFullProductData.js
│
└─ /src                         # Interne Tools & Verwaltung
    ├─ /stripe                  # Stripe-Exporte, Preise, Produkte
    │   ├─ exportFullProductData.js
    │   ├─ exportFullProductDataToExcel.js
    │   ├─ exportFullProductDataToExcelTest.js
    │   ├─ restoreFullProductData.js
    │   ├─ listProducts.js
    │   ├─ listPrices.js
    │   ├─ syncLiveProductsToTest.js
    │   ├─ updateTestProductFachbereiche.js
    │   └─ backupFullProductData.js
    │
    ├─ /sheets                  # Google Sheets API & Sync
    │   ├─ testGoogleSheetsConnection.js
    │   └─ updateStripeFromGoogleSheet.js
    │
    └─ /utils                   # Tools, Sessions, Rabatte
        ├─ checkKeys.js
        ├─ createDiscountCode.js
        ├─ createDynamicSession.js
        ├─ createMentaltrainerTest.js
        ├─ createSecondPrices.js
        └─ createSessionWithDiscount.js
🧩 Wichtige Hinweise
Immer zuerst TEST-Keys verwenden, bevor Live-Daten geändert werden.

.env und google-credentials.json niemals committen oder hochladen!

Bei Fehlern in der Sheets-API prüfen:

Freigabe für client_email im Google Sheet gesetzt?

Pfad in .env korrekt?

API in der Google Cloud aktiviert?

🔁 Standard-Workflows
Aktion	Befehl	Beschreibung
🔹 Test-Export	node --env-file=.env src/stripe/exportFullProductDataToExcelTest.js	Exportiert TEST-Produkte in Excel
🔹 Live-Export	node --env-file=.env src/stripe/exportFullProductDataToExcel.js	Exportiert Live-Produkte
🔹 Backup	node --env-file=.env src/stripe/backupFullProductData.js	Erstellt Backup als JSON & XLSX
🔹 Restore	node --env-file=.env src/stripe/restoreFullProductData.js	Stellt Backup wieder her
🔹 Google Sync	node --env-file=.env src/sheets/updateStripeFromGoogleSheet.js	Überträgt Daten aus Google Sheets zu Stripe
🔹 Verbindungstest	node --env-file=.env src/sheets/testGoogleSheetsConnection.js	Prüft Sheets-API-Zugriff