/**
 * SAP Reform - Data Flow Tests
 * Tests the complete flow: API Routes → Database → Dashboard Display
 * Uses TESTING_MODE=true to bypass authentication
 */

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create Prisma client using the same pattern as the app
const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "";
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    // @ts-ignore
    adapter, 
    log: ['query'] 
  });
};

const prisma = createPrismaClient();

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

test.describe.configure({ timeout: 30000 });

test.describe('API: Production Entry Flow', () => {
  test.beforeEach(async () => {
    // Clean up test data before each test
    await prisma.production.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test.afterEach(async () => {
    // Cleanup after test
    await prisma.production.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test('POST /api/production saves production data to database', async ({ request }) => {
    const response = await request.post('/api/production', {
      data: {
        date: today,
        b1JmlTelur: 100,
        b1Kg: 50.5,
        b1Pct: 98,
        b1Fc: 1.8,
        
        b1pJmlTelur: 80,
        b1pKg: 42.0,
        b1pPct: 95,
        b1pFc: 1.9,
        
        b2JmlTelur: 90,
        b2Kg: 45.0,
        b2Pct: 96,
        b2Fc: 1.85,
        
        b2pJmlTelur: 70,
        b2pKg: 35.5,
        b2pPct: 94,
        b2pFc: 1.92,
        
        b3JmlTelur: 85,
        b3Kg: 42.5,
        b3Pct: 97,
        b3Fc: 1.87,
        
        b3pJmlTelur: 65,
        b3pKg: 32.0,
        b3pPct: 93,
        b3pFc: 1.95,
        
        hargaSentral: 25000,
        up: 20000,
        operasional: 500000,
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.date).toBeDefined();
    expect(data.b1Kg).toBe(50.5);
  });

  test('GET /api/production retrieves production data', async ({ request }) => {
    // First create data
    await request.post('/api/production', {
      data: {
        date: today,
        b1Kg: 100,
        b1JmlTelur: 200,
        b1Pct: 95,
        b1Fc: 1.8,
      }
    });

    // Then retrieve it
    const response = await request.get(`/api/production?date=${today}`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.b1Kg).toBe(100);
  });
});

test.describe('API: Cash Flow Entry Flow', () => {
  test.beforeEach(async () => {
    await prisma.cashFlow.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test.afterEach(async () => {
    await prisma.cashFlow.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test('POST /api/cashflow saves cash flow data', async ({ request }) => {
    const response = await request.post('/api/cashflow', {
      data: {
        date: today,
        totalPenjualan: 5000000,
        biayaPakan: 1500000,
        biayaOperasional: 500000,
        gajiBepuk: 300000,
        gajiBarman: 300000,
        gajiAgung: 400000,
        gajiEki: 350000,
        gajiAdi: 350000,
        devidenA: 500000,
        devidenB: 500000,
        saldoKas: 10000000,
        saldoCash: 2000000,
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.totalPenjualan).toBe(5000000);
  });

  test('GET /api/cashflow retrieves cash flow data', async ({ request }) => {
    await request.post('/api/cashflow', {
      data: {
        date: today,
        totalPenjualan: 1000000,
        biayaPakan: 200000,
      }
    });

    const response = await request.get(`/api/cashflow?date=${today}`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

test.describe('API: Sales Entry Flow', () => {
  test.beforeEach(async () => {
    await prisma.sales.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test.afterEach(async () => {
    await prisma.sales.deleteMany({
      where: { date: new Date(today) }
    });
  });

  test('POST /api/sales saves sales transaction', async ({ request }) => {
    const response = await request.post('/api/sales', {
      data: {
        date: today,
        customerName: 'Test Customer',
        jmlPeti: 10,
        totalKg: 50,
        hargaJual: 26000,
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.customerName).toBe('Test Customer');
  });

  test('GET /api/sales retrieves sales transactions', async ({ request }) => {
    await request.post('/api/sales', {
      data: {
        date: today,
        customerName: 'Buyer One',
        jmlPeti: 5,
        totalKg: 25,
        hargaJual: 25000,
      }
    });

    const response = await request.get(`/api/sales?date=${today}`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

test.describe('API: Master Data Flow', () => {
  test.afterEach(async () => {
    // Reset master data to original values
    const cages = ['b1', 'b1p', 'b2', 'b2p', 'b3', 'b3p'];
    for (const Cage of cages) {
      const existing = await prisma.cageMaster.findUnique({
        where: { kandang: Cage }
      });
      if (existing) {
        await prisma.cageMaster.update({
          where: { kandang: Cage },
          data: { jmlAyam: 5000 }
        });
      }
    }
  });

  test('GET /api/master retrieves master data', async ({ request }) => {
    const response = await request.get('/api/master');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('POST /api/master updates cage master data', async ({ request }) => {
    const response = await request.post('/api/master', {
      data: {
        kandang: 'b1',
        jmlAyam: 5500,
        jmlEmber: 100,
        jmlPakan: 150,
        gramEkor: 65,
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.jmlAyam).toBe(5500);
  });
});

test.describe('Dashboard: Display Tests', () => {
  test.beforeEach(async () => {
    // Setup test data
    await prisma.production.deleteMany({ where: { date: new Date(today) } });
    await prisma.cashFlow.deleteMany({ where: { date: new Date(today) } });
    await prisma.sales.deleteMany({ where: { date: new Date(today) } });

    await prisma.production.create({
      data: {
        date: new Date(today),
        b1Kg: 100, b1pKg: 80, b2Kg: 90, b2pKg: 70, b3Kg: 85, b3pKg: 65,
        b1JmlTelur: 200, b1pJmlTelur: 160, b2JmlTelur: 180, b2pJmlTelur: 140, b3JmlTelur: 170, b3pJmlTelur: 130,
        totalKg: 490,
        totalJmlTelur: 980,
        hargaSentral: 25000,
        up: 20000,
      }
    });

    await prisma.cashFlow.create({
      data: {
        date: new Date(today),
        totalPenjualan: 10000000,
        biayaPakan: 2000000,
        biayaOperasional: 500000,
        saldoKas: 5000000,
        saldoCash: 1000000,
      }
    });

    await prisma.sales.create({
      data: {
        date: new Date(today),
        customerName: 'Test Buyer',
        jmlPeti: 20,
        totalKg: 100,
        hargaJual: 26000,
        subTotal: 2600000,
      }
    });
  });

  test.afterEach(async () => {
    // Cleanup test data
    await prisma.production.deleteMany({ where: { date: new Date(today) } });
    await prisma.cashFlow.deleteMany({ where: { date: new Date(today) } });
    await prisma.sales.deleteMany({ where: { date: new Date(today) } });
  });

  test('Dashboard page loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check dashboard title area is present
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Dashboard displays sales performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sales-related elements
    const content = await page.content();
    // Dashboard should show revenue (Pendapatan)
    expect(content).toContain('Rp');
  });

  test('Dashboard displays production stats', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have production data displayed
    const content = await page.content();
    // Stats cards use KG for production
    expect(content).toContain('KG');
  });
});

test.describe('Entry Form: Input and Save', () => {
  test('Entry page loads with all tabs', async ({ page }) => {
    await page.goto('/entry');
    await page.waitForLoadState('networkidle');

    // Check tabs are present
    await expect(page.locator('text=Produksi')).toBeVisible();
    await expect(page.locator('text=Arus Kas')).toBeVisible();
    await expect(page.locator('text=Penjualan')).toBeVisible();
    await expect(page.locator('text=Data Master')).toBeVisible();
  });

  test('Production form saves data correctly', async ({ page }) => {
    await page.goto('/entry');
    await page.waitForLoadState('networkidle');

    // Fill production data for B1
    const b1KgInput = page.locator('input').first();
    await b1KgInput.fill('150');

    // Click save button
    const saveButton = page.locator('button:has-text("Simpan Informasi")');
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('text=Data saved successfully')).toBeVisible({ timeout: 10000 });
  });
});