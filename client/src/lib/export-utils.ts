import * as XLSX from 'xlsx';
import type { Portfolio, Property, GLAccount, Note, ActionItem } from '@shared/schema';

export interface LenderPackageData {
  portfolio: Portfolio;
  properties: Property[];
  exportDate: string;
  exportType: string;
}

export interface ExcelExportData {
  portfolio: Portfolio;
  properties: Property[];
  glAccounts: GLAccount[];
  notes: Note[];
  actionItems: ActionItem[];
  exportDate: string;
  exportType: string;
}

export class ExportUtils {
  
  static async generateLenderPackage(data: LenderPackageData): Promise<Blob> {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Portfolio Summary Sheet
      const portfolioData = [
        ['Stanton Management LLC - Lender Package'],
        ['Generated:', new Date(data.exportDate).toLocaleString()],
        [''],
        ['Portfolio Summary'],
        ['Name', data.portfolio.name],
        ['Total Units', data.portfolio.totalUnits],
        ['Total NOI', `$${data.portfolio.totalNOI.toLocaleString()}`],
        ['Cap Rate', `${data.portfolio.capRate}%`],
        [''],
        ['Property Details']
      ];

      // Add property headers
      portfolioData.push([
        'Property Code',
        'Property Name', 
        'Units',
        'Monthly NOI',
        'NOI Margin',
        'Occupancy',
        'Revenue/Unit',
        'Cap Rate',
        'DSCR'
      ]);

      // Add property data
      data.properties.forEach(property => {
        portfolioData.push([
          property.code,
          property.name,
          property.units,
          property.monthlyNOI,
          `${property.noiMargin}%`,
          `${property.occupancy}%`,
          property.revenuePerUnit,
          `${property.capRate}%`,
          property.dscr
        ]);
      });

      const portfolioWS = XLSX.utils.aoa_to_sheet(portfolioData);
      XLSX.utils.book_append_sheet(wb, portfolioWS, 'Portfolio Summary');

      // Generate buffer and return as blob
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    } catch (error) {
      console.error('Error generating lender package:', error);
      throw new Error('Failed to generate lender package');
    }
  }

  static async generateExcelExport(data: ExcelExportData): Promise<Blob> {
    try {
      const wb = XLSX.utils.book_new();

      // Portfolio Summary Sheet
      const portfolioData = [
        ['Stanton Management LLC - Financial Report'],
        ['Generated:', new Date(data.exportDate).toLocaleString()],
        [''],
        ['Portfolio:', data.portfolio.name],
        ['Total Units:', data.portfolio.totalUnits],
        ['Total NOI:', `$${data.portfolio.totalNOI.toLocaleString()}`],
        ['Cap Rate:', `${data.portfolio.capRate}%`],
        ['']
      ];

      const portfolioWS = XLSX.utils.aoa_to_sheet(portfolioData);
      XLSX.utils.book_append_sheet(wb, portfolioWS, 'Summary');

      // GL Accounts Sheet
      const glHeaders = ['Property Code', 'GL Code', 'Description', 'Amount', 'Type', 'Month'];
      const glData = [glHeaders];
      
      data.glAccounts.forEach(account => {
        const property = data.properties.find(p => p.id === account.propertyId);
        glData.push([
          property?.code || 'Unknown',
          account.code,
          account.description,
          account.type === 'revenue' ? account.amount : -account.amount,
          account.type.toUpperCase(),
          account.month
        ]);
      });

      const glWS = XLSX.utils.aoa_to_sheet(glData);
      XLSX.utils.book_append_sheet(wb, glWS, 'GL Accounts');

      // Notes Sheet
      if (data.notes.length > 0) {
        const notesHeaders = ['Property Code', 'Cell ID', 'Note', 'Author', 'Date'];
        const notesData = [notesHeaders];
        
        data.notes.forEach(note => {
          const property = data.properties.find(p => p.id === note.propertyId);
          notesData.push([
            property?.code || 'Unknown',
            note.cellId,
            note.text,
            note.author,
            note.createdAt.toLocaleString()
          ]);
        });

        const notesWS = XLSX.utils.aoa_to_sheet(notesData);
        XLSX.utils.book_append_sheet(wb, notesWS, 'Notes');
      }

      // Action Items Sheet
      if (data.actionItems.length > 0) {
        const actionHeaders = ['Item ID', 'Property Code', 'Description', 'Priority', 'Status', 'Created Date'];
        const actionData = [actionHeaders];
        
        data.actionItems.forEach(item => {
          const property = data.properties.find(p => p.id === item.propertyId);
          actionData.push([
            item.itemId,
            property?.code || 'Unknown',
            item.description,
            item.priority,
            item.status,
            item.createdAt.toLocaleString()
          ]);
        });

        const actionWS = XLSX.utils.aoa_to_sheet(actionData);
        XLSX.utils.book_append_sheet(wb, actionWS, 'Action Items');
      }

      // Generate buffer and return as blob
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    } catch (error) {
      console.error('Error generating Excel export:', error);
      throw new Error('Failed to generate Excel export');
    }
  }

  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async exportLenderPackage(portfolioKey: string = 'hartford1'): Promise<void> {
    try {
      const response = await fetch(`/api/export/lender-package?portfolioKey=${portfolioKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lender package data');
      }
      
      const data: LenderPackageData = await response.json();
      const blob = await this.generateLenderPackage(data);
      const filename = `${data.portfolio.name}_Lender_Package_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Error exporting lender package:', error);
      throw error;
    }
  }

  static async exportToExcel(portfolioKey: string = 'hartford1'): Promise<void> {
    try {
      const response = await fetch(`/api/export/excel-data?portfolioKey=${portfolioKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch export data');
      }
      
      const data: ExcelExportData = await response.json();
      const blob = await this.generateExcelExport(data);
      const filename = `${data.portfolio.name}_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
}
