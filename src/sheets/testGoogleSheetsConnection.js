// src/sheets/testGoogleSheetsConnection.js
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

if (!spreadsheetId || !process.env.GOOGLE_CREDENTIALS_PATH) {
  console.error('❌ Fehlende .env-Variablen: GOOGLE_SHEET_ID oder GOOGLE_CREDENTIALS_PATH');
  process.exit(1);
}

async function testConnection(range = 'live_products!A1:O') {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rowCount = res.data.values ? res.data.values.length : 0;
    console.log('✅ Verbindung erfolgreich!');
    console.log(`📊 ${rowCount} Zeilen gefunden in ${range}`);
  } catch (err) {
    console.error('❌ Fehler bei Verbindung:', err.message);
    if (err.response) {
      console.error(`🔍 Details: HTTP ${err.response.status}, ${JSON.stringify(err.response.data)}`);
    }
    process.exit(1);
  }
}

testConnection();