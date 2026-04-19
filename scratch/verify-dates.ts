import { getWIBDateString, isTodayWIB } from '../src/lib/date-utils';

const now = new Date();
console.log('Current UTC time:', now.toISOString());
console.log('Current WIB Date String:', getWIBDateString(now));
console.log('Is Today WIB:', isTodayWIB(now));

// Test early morning (e.g., 01:00 WIB which is 18:00 UTC previous day)
const earlyMorningUTC = new Date('2026-04-18T18:00:00Z');
console.log('\nTesting 18:00 UTC (01:00 WIB the next day):');
console.log('UTC:', earlyMorningUTC.toISOString());
console.log('WIB Date:', getWIBDateString(earlyMorningUTC));

// Test late night (e.g., 23:00 WIB which is 16:00 UTC same day)
const lateNightUTC = new Date('2026-04-19T16:00:00Z');
console.log('\nTesting 16:00 UTC (23:00 WIB same day):');
console.log('UTC:', lateNightUTC.toISOString());
console.log('WIB Date:', getWIBDateString(lateNightUTC));
