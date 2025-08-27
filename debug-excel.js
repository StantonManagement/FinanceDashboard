import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './debug_excel.xlsx';

if (!fs.existsSync(filePath)) {
  console.log('Excel file not found');
  process.exit(1);
}

console.log('Reading Excel file:', filePath);
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('\n=== SHEET NAMES ===');
console.log(workbook.SheetNames);

// Examine each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== SHEET ${index + 1}: ${sheetName} ===`);
  
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return;
  
  // Convert to JSON array
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Rows: ${jsonData.length}`);
  
  // Show first 10 rows
  console.log('\n--- First 10 rows ---');
  jsonData.slice(0, 10).forEach((row, i) => {
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, row.slice(0, 10)); // First 10 columns
    }
  });
  
  // Look for S0010 or Hartford references
  console.log('\n--- Looking for S0010/Hartford references ---');
  jsonData.forEach((row, i) => {
    if (!row) return;
    row.forEach((cell, j) => {
      if (typeof cell === 'string' && (
        cell.includes('S0010') || 
        cell.includes('Hartford') || 
        cell.includes('228 Maple')
      )) {
        console.log(`Found at Row ${i}, Col ${j}: "${cell}"`);
      }
    });
  });
  
  // Look for revenue/expense patterns
  console.log('\n--- Looking for revenue/expense patterns ---');
  jsonData.forEach((row, i) => {
    if (!row) return;
    row.forEach((cell, j) => {
      if (typeof cell === 'string') {
        const cellLower = cell.toLowerCase();
        if (cellLower.includes('rent income') ||
            cellLower.includes('4105') ||
            cellLower.includes('property management') ||
            cellLower.includes('6105') ||
            cellLower.includes('maintenance') ||
            cellLower.includes('6110')) {
          console.log(`Found GL pattern at Row ${i}, Col ${j}: "${cell}"`);
          // Show nearby cells for context
          console.log('  Context:', row.slice(Math.max(0, j-2), j+5));
        }
      }
    });
  });
});