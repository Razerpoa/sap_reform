// API-level tests for data flow verification
// Run with: node tests/api-data-flow.js

const API_BASE = 'http://localhost:3000/api';
const today = new Date().toISOString().split('T')[0];

async function testProductionDataFlow() {
  console.log('\n📊 Testing Production Data Flow...\n');
  
  // 1. Save production data
  const productionData = {
    date: today,
    cageData: {
      "B1": {
        rows: [
          { peti: true, tray: 1, butir: 10 }, // 15kg + 40 butir
          { peti: false, tray: 0, butir: 0 },
          { peti: false, tray: 0, butir: 0 },
        ],
        extra: { extraTray: 0, extraButir: 0, extraKg: 5.5 } // 5.5kg
      }
    }
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
    const entry = await getRes.json();
    
    if (!entry || !entry.date) {
      console.log('❌ No production data found after save');
      return false;
    }
    
    console.log('✅ Production retrieved');
    
    // 3. Verify data matches what we saved
    const savedCage = productionData.cageData["B1"];
    const gotCage = entry.cageData["B1"];
    const matches = gotCage && 
                   gotCage.extra?.extraKg === savedCage.extra.extraKg &&
                   gotCage.rows?.length === savedCage.rows.length;
    if (matches) {
      console.log('✅ Data integrity verified');
    } else {
      console.log('❌ Data mismatch:', { saved: productionData.cageData["B1"], got: entry.cageData["B1"] });
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