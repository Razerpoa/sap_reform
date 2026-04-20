import { calculateProductionStats } from '../src/lib/calculations';
import { getWIBDateString } from '../src/lib/date-utils';

function test() {
  const today = getWIBDateString();
  console.log('Testing with today date:', today);
  
  const mockEntries = [
    { date: new Date(today), totalKg: 100 },
    { date: new Date(today), totalKg: 200 },
    { date: new Date('2026-04-18'), totalKg: 500 }
  ];

  const stats = calculateProductionStats(mockEntries);
  console.log('Today Kg Sum Result:', stats.todayKg);
  
  if (stats.todayKg === 300) {
    console.log('SUCCESS: Summation works correctly.');
  } else {
    console.log('FAILURE: Summation is incorrect. Got:', stats.todayKg);
  }
}

test();
