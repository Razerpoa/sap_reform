/**
 * SAP Reform - API Tests (Node.js based)
 * Tests API routes without Playwright browser dependencies
 * Run with: TESTING_MODE=true node tests/api-only.spec.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "";
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = createPrismaClient();

async function runTests() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Testing with date: ${today}\n`);
  let passed = 0;
  let failed = 0;

  // Test 1: Production POST
  try {
    const res = await fetch(`http://localhost:3000/api/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        b1Kg: 150,
        b1JmlTelur: 300,
        b1Pct: 95,
        b1Fc: 1.8,
      })
    });
    const data = await res.json();
    console.log('✓ Production POST:', res.ok ? 'PASS' : 'FAIL', data.error || '');
    res.ok ? passed++ : failed++;
  } catch(e) { console.log('✗ Production POST:', e.message); failed++; }

  // Test 2: Production GET
  try {
    const res = await fetch(`http://localhost:3000/api/production?date=${today}`);
    const data = await res.json();
    console.log('✓ Production GET:', res.ok && data.b1Kg === 150 ? 'PASS' : 'FAIL', `b1Kg=${data.b1Kg}`);
    res.ok && data.b1Kg === 150 ? passed++ : failed++;
  } catch(e) { console.log('✗ Production GET:', e.message); failed++; }

  // Test 3: CashFlow POST
  try {
    const res = await fetch(`http://localhost:3000/api/cashflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        totalPenjualan: 5000000,
        biayaPakan: 1500000,
        biayaOperasional: 500000,
      })
    });
    const data = await res.json();
    console.log('✓ CashFlow POST:', res.ok ? 'PASS' : 'FAIL', data.error || '');
    res.ok ? passed++ : failed++;
  } catch(e) { console.log('✗ CashFlow POST:', e.message); failed++; }

  // Test 4: CashFlow GET
  try {
    const res = await fetch(`http://localhost:3000/api/cashflow?date=${today}`);
    const data = await res.json();
    console.log('✓ CashFlow GET:', Array.isArray(data) ? 'PASS' : 'FAIL');
    Array.isArray(data) ? passed++ : failed++;
  } catch(e) { console.log('✗ CashFlow GET:', e.message); failed++; }

  // Test 5: Sales POST
  try {
    const res = await fetch(`http://localhost:3000/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        customerName: 'Test Buyer',
        jmlPeti: 10,
        totalKg: 50,
        hargaJual: 26000,
      })
    });
    const data = await res.json();
    console.log('✓ Sales POST:', res.ok ? 'PASS' : 'FAIL', data.error || '');
    res.ok ? passed++ : failed++;
  } catch(e) { console.log('✗ Sales POST:', e.message); failed++; }

  // Test 6: Sales GET
  try {
    const res = await fetch(`http://localhost:3000/api/sales?date=${today}`);
    const data = await res.json();
    console.log('✓ Sales GET:', Array.isArray(data) && data.length > 0 ? 'PASS' : 'FAIL');
    Array.isArray(data) && data.length > 0 ? passed++ : failed++;
  } catch(e) { console.log('✗ Sales GET:', e.message); failed++; }

  // Test 7: Master GET
  try {
    const res = await fetch('http://localhost:3000/api/master');
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = []; }
    console.log('✓ Master GET:', Array.isArray(data) ? 'PASS' : 'FAIL', `count=${data.length || 0}`);
    Array.isArray(data) ? passed++ : failed++;
  } catch(e) { console.log('✗ Master GET:', e.message); failed++; }

  // Test 8: Master POST
  try {
    const res = await fetch('http://localhost:3000/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kandang: 'b1',
        jmlAyam: 5500,
        jmlEmber: 100,
      })
    });
    const data = await res.json();
    console.log('✓ Master POST:', res.ok ? 'PASS' : 'FAIL');
    res.ok ? passed++ : failed++;
  } catch(e) { console.log('✗ Master POST:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();