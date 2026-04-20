const { getWIBDateString } = require('./src/lib/date-utils');

console.log('Current local time:', new Date().toISOString());
console.log('getWIBDateString():', getWIBDateString());
