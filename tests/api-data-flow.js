// API-level tests for data flow verification
// Run with: node tests/api-data-flow.js

const API_BASE = 'http://localhost:3000/api';
const today = new Date().toISOString().split('T')[0];

async function testProductionDataFlow() {
  console.log('\n📊 Testing Production Data Flow...\n');
  
  // 1. Save production data
  const productionData = {
    date: today,
    b1JmlTelur: 100,
    b1Kg: 50.5,
    b1Pct: 95.2,
    b1Fc: 1200,
    b1pJmlTelur: 80,
    b1pKg: 42.0,
    b2JmlTelur: 90,
    b2Kg: 45.0,
    b2pJmlTelur: 75,
    b2pKg: 38.5,
    b3JmlTelur: 85,
    b3Kg: 42.5,
    b3pJmlTelur: 70,
    b3pKg: 35.0,
    totalJmlTelur: 500,
    totalKg: 253.5,
    hargaSentral: 25000,
    up: 5000,
    operasional: 10000,
    profitDaily: 50000
  };

  try {
    const saveRes = await fetch(`${API_BASE}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productionData)
    });
    
    if (!saveRes.ok) {
      const err = await saveRes.json();
      console.log('❌ Failed to save production:', err.error || saveRes.status);
      return false;
    }
    
    const saved = await saveRes.json();
    console.log('✅ Production saved:', saved.date || today);
    
    // 2. Retrieve the data we just saved
    const getRes = await fetch(`${API_BASE}/production?date=${today}`);
    const entries = await getRes.json();
    
    if (entries.length === 0) {
      console.log('❌ No production data found after save');
      return false;
    }
    
    const entry = entries[0];
    console.log('✅ Production retrieved:', entry.b1Kg, 'KG');
    
    // 3. Verify data matches what we saved
    const matches = entry.b1Kg === productionData.b1Kg && entry.totalKg === productionData.totalKg;
    if (matches) {
      console.log('✅ Data integrity verified');
    } else {
      console.log('❌ Data mismatch:', { saved: productionData.b1Kg, got: entry.b1Kg });
    }
    
    return matches;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function testCashFlowDataFlow() {
  console.log('\n💰 Testing CashFlow Data Flow...\n');
  
  const cashFlowData = {
    date: today,
    totalPenjualan: 500000,
    biayaPakan: 200000,
    biayaOperasional: 100000,
    saldoCash: 200000
  };

  try {
    const saveRes = await fetch(`${API_BASE}/cashflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cashFlowData)
    });
    
    if (!saveRes.ok) {
      const err = await saveRes.json();
      console.log('❌ Failed to save cashflow:', err.error || saveRes.status);
      return false;
    }
    
    console.log('✅ CashFlow saved');
    
    // 2. Retrieve
    const getRes = await fetch(`${API_BASE}/cashflow?date=${today}`);
    const entries = await getRes.json();
    
    if (entries.length === 0) {
      console.log('❌ No cashflow data found');
      return false;
    }
    
    console.log('✅ CashFlow retrieved:', entries[0].totalPenjualan);
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function testDashboardEndpoint() {
  console.log('\n📈 Testing Dashboard Endpoint...\n');
  
  try {
    const res = await fetch('http://localhost:3000/');
    const html = await res.text();
    
    const hasContent = html.includes('Executive Dashboard') || html.includes('Dashboard');
    if (hasContent) {
      console.log('✅ Dashboard loads');
    } else {
      console.log('⚠️ Dashboard may have issues');
    }
    
    return hasContent;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('🔄 Starting Data Flow Tests\n');
  console.log('Date:', today);
  
  const results = []
  results.push(await testProductionDataFlow());
  results.push(await testCashFlowDataFlow());
  results.push(await testDashboardEndpoint());
  
  console.log('\n' + '='.repeat(30));
  const passed = results.filter(Boolean).length;
  console.log(`Result: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('✅ All data flow tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
  
  process.exit(passed === results.length ? 0 : 1);
}

runTests();