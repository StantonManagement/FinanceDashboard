import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'd:/WORK Files/Stanton/Monthly Review_DataOnly.xlsx';

console.log('=== EXAMINING UPDATED EXCEL FILE ===');
console.log('File:', filePath);

if (!fs.existsSync(filePath)) {
  console.log('Excel file not found');
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('\n=== SHEET NAMES (6 sheets) ===');
workbook.SheetNames.forEach((name, index) => {
  console.log(`${index + 1}. ${name}`);
});

// Examine each sheet structure
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== SHEET ${index + 1}: ${sheetName} ===`);
  
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.log('Sheet not found');
    return;
  }
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`Rows: ${jsonData.length}`);
  
  // Show first 15 rows to understand structure
  console.log('\n--- First 15 rows ---');
  jsonData.slice(0, 15).forEach((row, i) => {
    if (row && row.length > 0) {
      // Show first 10 columns to avoid too much output
      const displayRow = row.slice(0, 10).map(cell => {
        if (typeof cell === 'string' && cell.length > 30) {
          return cell.substring(0, 30) + '...';
        }
        return cell;
      });
      console.log(`Row ${i}: [${displayRow.join(', ')}]`);
    }
  });
  
  // Look for property codes and financial data patterns
  console.log('\n--- Looking for Property Codes (S00XX) ---');
  let foundProperties = new Set();
  jsonData.forEach((row, i) => {
    if (!row) return;
    row.forEach((cell, j) => {
      if (typeof cell === 'string') {
        const match = cell.match(/S00\d{2}/g);
        if (match) {
          match.forEach(code => {
            if (!foundProperties.has(code)) {
              foundProperties.add(code);
              console.log(`Found ${code} at Row ${i}, Col ${j}: "${cell}"`);
            }
          });
        }
      }
    });
  });
  
  // Look for financial account patterns
  console.log('\n--- Looking for Financial Patterns ---');
  let accountPatterns = [];
  jsonData.forEach((row, i) => {
    if (!row) return;
    row.forEach((cell, j) => {
      if (typeof cell === 'string') {
        const cellLower = cell.toLowerCase();
        if (cellLower.includes('rent income') || 
            cellLower.includes('total operating') ||
            cellLower.includes('net income') ||
            cellLower.includes('noi') ||
            cellLower.includes('revenue') ||
            cellLower.includes('expense') ||
            /^\d{4}$/.test(cell)) {  // 4-digit GL codes
          accountPatterns.push(`Row ${i}, Col ${j}: "${cell}"`);
        }
      }
    });
  });
  
  if (accountPatterns.length > 0) {
    console.log('Financial patterns found:');
    accountPatterns.slice(0, 10).forEach(pattern => console.log(`  ${pattern}`));
    if (accountPatterns.length > 10) {
      console.log(`  ... and ${accountPatterns.length - 10} more`);
    }
  }
});

console.log('\n=== SUMMARY ===');
console.log(`Total sheets: ${workbook.SheetNames.length}`);
console.log('Sheet names:', workbook.SheetNames);