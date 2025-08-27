import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './debug_excel.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

const worksheet = workbook.Sheets['>>T12'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== >>T12 Sheet Column Headers Analysis ===');
const headerRow = jsonData[8]; // Row 8 has the column headers
console.log('Header row (row 8):');
headerRow.forEach((header, index) => {
  if (header && index >= 140 && index <= 160) {
    console.log(`Column ${index}: "${header}"`);
  }
});

console.log('\n=== Looking for actual S0010 data columns ===');
// Look for columns that might have S0010 data with real amounts
for (let colIndex = 140; colIndex <= 160; colIndex++) {
  console.log(`\nColumn ${colIndex} analysis:`);
  
  // Check first few data rows for this column
  for (let rowIndex = 12; rowIndex < 20; rowIndex++) {
    const row = jsonData[rowIndex];
    if (!row) continue;
    
    const glCode = row[1];
    const accountName = row[2];
    const value = row[colIndex];
    
    if (glCode === '4105' && value && typeof value === 'number') {
      console.log(`  Row ${rowIndex} (Rent Income): GL ${glCode} | ${accountName} | $${value}`);
      if (Math.abs(value) > 100 && Math.abs(value) < 20000) {
        console.log(`    *** POTENTIAL REAL RENT DATA: $${value} ***`);
      }
    }
  }
}