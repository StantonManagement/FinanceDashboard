import * as XLSX from 'xlsx';
import type { GLAccount, Property } from '@shared/schema';

export interface ProcessedExcelData {
  properties: Partial<Property>[];
  glAccounts: Partial<GLAccount>[];
  sheets: string[];
  rawData: any;
}

export class ExcelProcessor {
  private workbook: XLSX.WorkBook | null = null;

  constructor() {}

  async processFile(buffer: ArrayBuffer): Promise<ProcessedExcelData> {
    try {
      // Read the workbook
      this.workbook = XLSX.read(buffer, { type: 'array' });
      
      if (!this.workbook) {
        throw new Error('Failed to read Excel file');
      }

      const sheetNames = this.workbook.SheetNames;
      const authoritativeSheets = sheetNames.filter(name => name.startsWith('>>'));
      
      if (authoritativeSheets.length === 0) {
        throw new Error('No authoritative sheets found (sheets starting with >>)');
      }

      console.log('Found authoritative sheets:', authoritativeSheets);

      const processedData: ProcessedExcelData = {
        properties: [],
        glAccounts: [],
        sheets: sheetNames,
        rawData: {}
      };

      // Process each authoritative sheet
      for (const sheetName of authoritativeSheets) {
        const worksheet = this.workbook.Sheets[sheetName];
        if (!worksheet) continue;

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        processedData.rawData[sheetName] = jsonData;

        // Determine sheet type and process accordingly
        if (sheetName.includes('Balance') || sheetName.includes('LastMnth') || sheetName.includes('T12')) {
          await this.processFinancialSheet(jsonData, processedData, sheetName);
        }
      }

      return processedData;
    } catch (error) {
      console.error('Excel processing error:', error);
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }

  private async processFinancialSheet(
    data: any[][],
    processedData: ProcessedExcelData,
    sheetName: string
  ): Promise<void> {
    if (!data || data.length < 2) return;

    // Look for property codes and GL account data
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      // Check if this row contains a property code (e.g., S0010)
      const propertyCode = this.extractPropertyCode(row);
      if (propertyCode) {
        // Process property data
        const property = this.processPropertyRow(row, propertyCode);
        if (property) {
          processedData.properties.push(property);
        }
      }

      // Check if this row contains GL account data
      const glAccount = this.processGLAccountRow(row, currentMonth, sheetName);
      if (glAccount) {
        processedData.glAccounts.push(glAccount);
      }
    }
  }

  private extractPropertyCode(row: any[]): string | null {
    for (const cell of row) {
      if (typeof cell === 'string' && /^S\d{4}$/.test(cell)) {
        return cell;
      }
    }
    return null;
  }

  private processPropertyRow(row: any[], code: string): Partial<Property> | null {
    try {
      // Look for common property data patterns
      const property: Partial<Property> = {
        code,
        name: this.extractPropertyName(row),
        units: this.extractNumericValue(row, 'units'),
        monthlyNOI: this.extractNumericValue(row, 'noi'),
        occupancy: this.extractPercentValue(row, 'occupancy'),
        revenuePerUnit: this.extractNumericValue(row, 'revenue')
      };

      // Only return if we found some meaningful data
      if (property.name || property.units || property.monthlyNOI) {
        return property;
      }
    } catch (error) {
      console.warn('Error processing property row:', error);
    }
    return null;
  }

  private processGLAccountRow(row: any[], month: string, sheetName: string): Partial<GLAccount> | null {
    try {
      // Look for GL account codes (4-digit numbers starting with 4, 5, or 6)
      let glCode: string | null = null;
      let description: string | null = null;
      let amount: number | null = null;

      for (let i = 0; i < row.length; i++) {
        const cell = row[i];
        
        // Check for GL code
        if (typeof cell === 'string' && /^[4-6]\d{3}$/.test(cell)) {
          glCode = cell;
          // Description might be in the next cell
          if (i + 1 < row.length && typeof row[i + 1] === 'string') {
            description = row[i + 1];
          }
        }
        
        // Check for numeric amounts
        if (typeof cell === 'number' && Math.abs(cell) > 0) {
          amount = cell;
        }
      }

      if (glCode && amount !== null) {
        const type = this.determineAccountType(glCode);
        return {
          code: glCode,
          description: description || this.getDefaultDescription(glCode),
          amount: Math.abs(amount), // Store as positive, type determines revenue vs expense
          type,
          month
        };
      }
    } catch (error) {
      console.warn('Error processing GL account row:', error);
    }
    return null;
  }

  private extractPropertyName(row: any[]): string | undefined {
    for (const cell of row) {
      if (typeof cell === 'string' && cell.includes('Maple')) {
        return cell;
      }
    }
    return undefined;
  }

  private extractNumericValue(row: any[], context: string): number | undefined {
    // Simple heuristic to find relevant numeric values
    const numbers = row.filter(cell => typeof cell === 'number' && cell > 0);
    if (numbers.length > 0) {
      // Return the first reasonable number based on context
      if (context === 'units') {
        return numbers.find(n => n < 100) || numbers[0]; // Units typically < 100
      } else if (context === 'noi') {
        return numbers.find(n => n > 1000) || numbers[0]; // NOI typically > 1000
      } else if (context === 'revenue') {
        return numbers.find(n => n > 500 && n < 5000) || numbers[0]; // Revenue per unit range
      }
    }
    return undefined;
  }

  private extractPercentValue(row: any[], context: string): number | undefined {
    for (const cell of row) {
      if (typeof cell === 'number' && cell > 0 && cell <= 1) {
        return cell * 100; // Convert decimal to percentage
      } else if (typeof cell === 'number' && cell > 0 && cell <= 100) {
        return cell; // Already a percentage
      }
    }
    return undefined;
  }

  private determineAccountType(glCode: string): 'revenue' | 'expense' {
    const firstDigit = glCode.charAt(0);
    return firstDigit === '4' ? 'revenue' : 'expense';
  }

  private getDefaultDescription(glCode: string): string {
    const descriptions: Record<string, string> = {
      '4105': 'Rent Income',
      '4110': 'Section 8 Rent',
      '6105': 'Property Management',
      '6110': 'Maintenance & Repairs',
      '6120': 'Utilities',
      '6130': 'Property Insurance',
      '6140': 'Property Taxes'
    };
    return descriptions[glCode] || `GL Account ${glCode}`;
  }

  getSheetNames(): string[] {
    return this.workbook ? this.workbook.SheetNames : [];
  }

  getSheetData(sheetName: string): any[][] | null {
    if (!this.workbook || !this.workbook.Sheets[sheetName]) {
      return null;
    }
    return XLSX.utils.sheet_to_json(this.workbook.Sheets[sheetName], { header: 1 });
  }
}

export const excelProcessor = new ExcelProcessor();
