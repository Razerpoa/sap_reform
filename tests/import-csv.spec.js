/**
 * SAP Reform - CSV Import Tests
 * Tests the standalone import-csv.ts script for Worker canSell field
 * Run with: npx tsx tests/import-csv.spec.js
 * Requires DATABASE_URL env var and running PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "";
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = createPrismaClient();
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'import-csv.ts');

async function runTests() {
  console.log('=== CSV Import Tests (Worker canSell) ===\n');
  let passed = 0;
  let failed = 0;

  const testWorkerName = `Test Worker CSV ${Date.now()}`;
  const csvPath = path.resolve(__dirname, `_test_worker_${Date.now()}.csv`);

  // Test 1: Import worker with canSell=true from CSV
  try {
    // Create a temp CSV with canSell field
    const csvContent = 'name,active,canSell\n' + testWorkerName + ',true,true\n';
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    // Run the import script
    execSync(`npx tsx "${scriptPath}" Worker "${csvPath}"`, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
      env: { ...process.env },
    });

    // Verify the worker was created with canSell=true
    const worker = await prisma.worker.findUnique({
      where: { name: testWorkerName }
    });

    const ok = worker !== null && worker.canSell === true;
    console.log(`✓ CSV Import Worker canSell=true:`, ok ? 'PASS' : 'FAIL',
      worker ? `canSell=${worker.canSell}` : 'worker not found');
    ok ? passed++ : failed++;

    // Clean up test worker
    if (worker) {
      await prisma.worker.delete({ where: { id: worker.id } });
    }
  } catch(e) {
    console.log('✗ CSV Import Worker canSell=true:', 'FAIL', e.message);
    failed++;
  } finally {
    // Clean up temp CSV
    try { fs.unlinkSync(csvPath); } catch {}
  }

  // Test 2: Import worker without canSell (should default to false)
  const testWorkerName2 = `Test Worker CSV2 ${Date.now()}`;
  const csvPath2 = path.resolve(__dirname, `_test_worker2_${Date.now()}.csv`);

  try {
    const csvContent = 'name,active\n' + testWorkerName2 + ',true\n';
    fs.writeFileSync(csvPath2, csvContent, 'utf-8');

    execSync(`npx tsx "${scriptPath}" Worker "${csvPath2}"`, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
      env: { ...process.env },
    });

    const worker = await prisma.worker.findUnique({
      where: { name: testWorkerName2 }
    });

    // Without canSell specified, the field should use DB default (false)
    // but the import can also explicitly set it
    const ok = worker !== null && worker.canSell === false;
    console.log(`✓ CSV Import Worker no canSell (default false):`, ok ? 'PASS' : 'FAIL',
      worker ? `canSell=${worker.canSell}` : 'worker not found');
    ok ? passed++ : failed++;

    if (worker) {
      await prisma.worker.delete({ where: { id: worker.id } });
    }
  } catch(e) {
    console.log('✗ CSV Import Worker no canSell:', 'FAIL', e.message);
    failed++;
  } finally {
    try { fs.unlinkSync(csvPath2); } catch {}
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests()
  .catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
