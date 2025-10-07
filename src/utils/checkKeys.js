// src/utils/checkKeys.js
import dotenv from 'dotenv';

dotenv.config();

const liveKey = process.env.STRIPE_SECRET_KEY_LIVE;
const testKey = process.env.STRIPE_SECRET_KEY_TEST;

if (!liveKey || !testKey) {
  console.error('❌ Fehlende Keys in .env!');
  process.exit(1);
}

console.log('🔑 Live-Key: ' + (liveKey.startsWith('sk_live') ? 'LIVE' : 'ERROR'));
console.log('🔑 Test-Key: ' + (testKey.startsWith('sk_test') ? 'TEST' : 'ERROR'));