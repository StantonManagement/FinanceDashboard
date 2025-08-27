import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './debug_excel.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

// Check >>T12 sheet for S0010 data
const worksheet = workbook.Sheets['>>T12'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('\n=== >>T12 Sheet S0010 Analysis ===');

// Look for S0010 column (we know it's around column 145-159)
const s0010Columns = [];
jsonData[0].forEach((cell, index) => {
  if (typeof cell === 'string' && cell.includes('S0010')) {
    s0010Columns.push(index);
    console.log(`S0010 found at column ${index}: "${cell}"`);
  }
});

if (s0010Columns.length > 0) {
  const columnIndex = s0010Columns[0]; // Use first S0010 column
  
  console.log(`\nAnalyzing S0010 data at column ${columnIndex}:`);
  
  // Look specifically at rows 8-50 where the P&L data should be
  for (let i = 8; i < Math.min(50, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    const glCode = row[1];
    const accountName = row[2];
    const value = row[columnIndex];
    
    if (accountName && value && typeof value === 'number' && Math.abs(value) > 0) {
      console.log(`Row ${i}: GL ${glCode} | ${accountName} | $${value}`);
      
      // Look for revenue items
      if (accountName.toString().toLowerCase().includes('rent income') || 
          glCode === '4105') {
        console.log(`  *** RENT INCOME: $${value} ***`);
      }
    }
  }
}

// Also check >>LastMnth for comparison
console.log('\n=== >>LastMnth Sheet S0010 Analysis ===');
const lastMnthSheet = workbook.Sheets['>>LastMnth'];
const lastMnthData = XLSX.utils.sheet_to_json(lastMnthSheet, { header: 1 });

// Find S0010 column in >>LastMnth (we know it's column 12)
console.log('Looking at column 12 for >>LastMnth:');
for (let i = 10; i < Math.min(30, lastMnthData.length); i++) {
  const row = lastMnthData[i];
  if (!row) continue;
  
  const accountName = row[1];
  const value = row[12]; // S0010 column
  
  if (accountName && value && typeof value === 'number' && Math.abs(value) > 0) {
    console.log(`Row ${i}: ${accountName} | $${value}`);
    
    if (accountName.toString().toLowerCase().includes('rent')) {
      console.log(`  *** FOUND RENT: $${value} ***`);
    }
  }
}