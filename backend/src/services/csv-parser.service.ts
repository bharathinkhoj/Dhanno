import Papa from 'papaparse';

interface CSVRow {
  [key: string]: string;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  type: 'income' | 'expense' | 'asset';
  category?: string;
  source?: string;
  originalData: CSVRow;
}

interface CSVFormat {
  name: string;
  dateColumn: string[];
  descriptionColumn: string[];
  amountColumn: string[];
  merchantColumn?: string[];
  typeColumn?: string[];
  dateFormat?: string;
  detectPattern: (headers: string[]) => boolean;
}

// Common Indian bank CSV formats
const BANK_FORMATS: CSVFormat[] = [
  // SBI (State Bank of India) - Put SBI first for better detection
  {
    name: 'SBI',
    dateColumn: ['Txn Date', 'Value Date', 'Transaction Date', 'Date'],
    descriptionColumn: ['Description', 'Remarks', 'Narration', 'Transaction Remarks'],
    amountColumn: ['Debit', 'Credit', 'Amount', 'Transaction Amount'], // Debit and Credit are separate columns
    typeColumn: ['Type'],
    detectPattern: (headers) => {
      const hasTxnDate = headers.some(h => h && h.trim() === 'Txn Date');
      const hasDescription = headers.some(h => h && h.trim() === 'Description');
      const hasDebit = headers.some(h => h && (h.trim() === 'Debit' || h.includes('Debit')));
      const hasCredit = headers.some(h => h && (h.trim() === 'Credit' || h.includes('Credit')));
      const hasRefNo = headers.some(h => h && h.includes('Ref No.'));
      const hasBalance = headers.some(h => h && h.trim() === 'Balance');
      
      // Very specific SBI detection: must have Txn Date AND separate Debit/Credit columns AND Ref No./Cheque No.
      return hasTxnDate && hasDescription && hasDebit && hasCredit && hasRefNo && hasBalance;
    }
  },

  // HDFC Bank
  {
    name: 'HDFC Bank',
    dateColumn: ['Date', 'Transaction Date', 'Value Date', '', '_1'], // Remove 'Txn Date' to avoid conflict with SBI
    descriptionColumn: ['Description', 'Narration', 'Transaction Details', 'Particulars', '_1', '_2'],
    amountColumn: ['Amount', 'Debit Amount', 'Credit Amount', 'Transaction Amount', '_12', '_14'],
    typeColumn: ['Transaction Type', 'Type'],
    detectPattern: (headers) => 
      headers.some(h => h && h.includes('HDFC')) || 
      headers.some(h => h && h.includes('Chq/Ref Number')) ||
      headers.some(h => h && h.includes('Narration')) ||
      (headers.length > 15 && headers.includes('_12') && headers.includes('_14')) // Malformed HDFC format
  },
  
  // ICICI Bank
  {
    name: 'ICICI Bank',
    dateColumn: ['Transaction Date', 'Value Date', 'Date'],
    descriptionColumn: ['Transaction Remarks', 'Description', 'Narration'],
    amountColumn: ['Amount', 'Debit Amount', 'Credit Amount'],
    typeColumn: ['Transaction Type'],
    detectPattern: (headers) => 
      headers.some(h => h.includes('ICICI')) ||
      headers.some(h => h.includes('Transaction Remarks')) ||
      headers.some(h => h.includes('Reference Number'))
  },
  
  // Axis Bank
  {
    name: 'Axis Bank',
    dateColumn: ['Transaction Date', 'Date', 'Tran Date'],
    descriptionColumn: ['Particulars', 'Description', 'Transaction Details'],
    amountColumn: ['Amount', 'Debit Amount', 'Credit Amount'],
    detectPattern: (headers) => 
      headers.some(h => h.includes('Axis')) ||
      headers.some(h => h.includes('Particulars')) ||
      headers.some(h => h.includes('Instrument Number'))
  },
  
  // Kotak Mahindra Bank
  {
    name: 'Kotak Bank',
    dateColumn: ['Transaction Date', 'Date'],
    descriptionColumn: ['Description', 'Narration', 'Transaction Description'],
    amountColumn: ['Amount', 'Debit Amount', 'Credit Amount'],
    detectPattern: (headers) => 
      headers.some(h => h.includes('Kotak')) ||
      headers.some(h => h.includes('Balance'))
  },
  
  // PNB (Punjab National Bank)
  {
    name: 'PNB',
    dateColumn: ['Tran Date', 'Transaction Date', 'Date'],
    descriptionColumn: ['Transaction Details', 'Description', 'Narration'],
    amountColumn: ['Amount', 'Debit', 'Credit'],
    detectPattern: (headers) => 
      headers.some(h => h.includes('PNB')) ||
      headers.some(h => h.includes('Tran Date'))
  },
  
  // Bank of Baroda
  {
    name: 'Bank of Baroda',
    dateColumn: ['Transaction Date', 'Date'],
    descriptionColumn: ['Transaction Particulars', 'Description', 'Remarks'],
    amountColumn: ['Amount', 'Debit Amount', 'Credit Amount'],
    detectPattern: (headers) => 
      headers.some(h => h.includes('Baroda')) ||
      headers.some(h => h.includes('Transaction Particulars'))
  },
  
  // Generic format
  {
    name: 'Generic',
    dateColumn: ['date', 'Date', 'transaction_date', 'Transaction Date'],
    descriptionColumn: ['description', 'Description', 'memo', 'Memo', 'payee', 'Payee'],
    amountColumn: ['amount', 'Amount', 'debit', 'Debit', 'credit', 'Credit'],
    merchantColumn: ['merchant', 'Merchant', 'payee', 'Payee'],
    detectPattern: () => true // Fallback
  }
];

export class CSVParserService {
  private static readonly MONTH_MAP = new Map([
    ['jan', 0], ['feb', 1], ['mar', 2], ['apr', 3], ['may', 4], ['jun', 5],
    ['jul', 6], ['aug', 7], ['sep', 8], ['oct', 9], ['nov', 10], ['dec', 11]
  ]);
  
  parseCSV(csvText: string, userSource?: string): Promise<{ format: CSVFormat | null, transactions: ParsedTransaction[], headers: string[], preview: CSVRow[] }> {
    return new Promise((resolve, reject) => {

      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as CSVRow[];
            const headers = Object.keys(data[0] || {});
            
            // Detect format
            const format = this.detectFormat(headers);
            
            // Parse transactions
            const transactions = data.map(row => this.parseRow(row, format, userSource)).filter(Boolean) as ParsedTransaction[];
            
            resolve({
              format,
              transactions,
              headers,
              preview: data.slice(0, 5) // First 5 rows for preview
            });
          } catch (error) {
            console.error('CSV parsing error:', error);
            reject(error);
          }
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }

  private detectFormat(headers: string[]): CSVFormat | null {
    for (const format of BANK_FORMATS) {
      if (format.detectPattern(headers)) {
        return format;
      }
    }
    return null;
  }

  private parseRow(row: CSVRow, format: CSVFormat | null, userSource?: string): ParsedTransaction | null {
    if (!format) {
      return null;
    }

    try {
      // Find date
      // Find and parse date
      const dateValue = this.findColumnValue(row, format.dateColumn);
      if (!dateValue) return null;
      
      const date = this.parseDate(dateValue);
      if (!date) return null;

      // Find description
      const description = this.findColumnValue(row, format.descriptionColumn) || 'Unknown Transaction';

      // Find amount - special handling for different bank formats
      let amountValue = this.findColumnValue(row, format.amountColumn);
      
      // For SBI format, handle separate Debit and Credit columns
      if (format.name === 'SBI') {
        // Handle the case where column names might have extra spaces
        const debitAmount = this.findColumnValue(row, ['Debit', '        Debit']);
        const creditAmount = this.findColumnValue(row, ['Credit']);
        
        // Check if debit has actual numeric value (not just spaces)
        let hasValidDebit = false;
        if (debitAmount && debitAmount.trim() !== '' && debitAmount.trim() !== ' ') {
          const cleanDebit = debitAmount.replace(/[,\s"]/g, '');
          const debitNum = parseFloat(cleanDebit);
          if (!isNaN(debitNum) && debitNum > 0) {
            amountValue = 'DEBIT:' + debitNum.toString();
            hasValidDebit = true;
          }
        }
        
        // Check credit column (only if no valid debit found)
        if (!hasValidDebit && creditAmount && creditAmount.trim() !== '' && creditAmount.trim() !== ' ') {
          const cleanCredit = creditAmount.replace(/[,\s"]/g, '');
          const creditNum = parseFloat(cleanCredit);
          if (!isNaN(creditNum) && creditNum > 0) {
            amountValue = 'CREDIT:' + creditNum.toString();
          }
        }
        
        if (!amountValue) {
          return null;
        }
      }
      // For HDFC format, specifically check debit and credit columns
      else if (format.name === 'HDFC Bank') {
        // Try to find debit and credit columns with various possible names
        const debitValue = this.findColumnValue(row, ['Debit Amount', 'Debit Amount       ', '_12']);
        const creditValue = this.findColumnValue(row, ['Credit Amount', 'Credit Amount      ', '_14']);
        
        let debitAmount = 0;
        let creditAmount = 0;
        
        if (debitValue && debitValue.trim() !== '' && debitValue.trim() !== '0.00') {
          debitAmount = parseFloat(debitValue.replace(/[,\s]/g, ''));
        }
        
        if (creditValue && creditValue.trim() !== '' && creditValue.trim() !== '0.00') {
          creditAmount = parseFloat(creditValue.replace(/[,\s]/g, ''));
        }
        
        if (debitAmount > 0) {
          amountValue = 'DEBIT:' + debitAmount.toString();
        } else if (creditAmount > 0) {
          amountValue = 'CREDIT:' + creditAmount.toString();
        } else {
          return null; // No valid amount
        }
      }
      
      if (!amountValue) return null;
      
      const amount = this.parseAmount(amountValue);
      if (isNaN(amount)) return null;

      // Find merchant (optional)
      const merchant = format.merchantColumn ? 
        this.findColumnValue(row, format.merchantColumn) : 
        this.extractMerchantFromDescription(description);

      // Determine type based on transaction description and amount
      const type = this.determineTransactionType(description, amount);

      // Use user-provided source or determine source based on detected format
      const source = userSource || this.getTransactionSource(format);

      return {
        date: date.toISOString().split('T')[0],
        description: description.trim(),
        amount: Math.abs(amount),
        merchant: merchant?.trim(),
        type,
        source,
        originalData: row
      };
    } catch (error) {
      console.error('Error parsing row:', error, row);
      return null;
    }
  }

  private findColumnValue(row: CSVRow, columnNames: string[]): string | null {
    for (const columnName of columnNames) {
      // Exact match
      if (row[columnName]) {
        return row[columnName];
      }
      
      // Case insensitive match
      const key = Object.keys(row).find(k => 
        k.toLowerCase() === columnName.toLowerCase()
      );
      if (key && row[key]) {
        return row[key];
      }
      
      // Match with trimmed spaces (for SBI columns like "        Debit")
      const trimmedKey = Object.keys(row).find(k => 
        k.trim().toLowerCase() === columnName.toLowerCase()
      );
      if (trimmedKey && row[trimmedKey]) {
        return row[trimmedKey];
      }
      
      // Partial match (for columns that contain the name)
      const partialKey = Object.keys(row).find(k => 
        k.toLowerCase().includes(columnName.toLowerCase())
      );
      if (partialKey && row[partialKey]) {
        return row[partialKey];
      }
    }
    
    // Special handling for malformed HDFC CSV - try to find data in any column
    if (columnNames.includes('')) {
      // Look for date pattern in first column
      const firstCol = row[''];
      if (firstCol && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstCol)) {
        return firstCol;
      }
    }
    
    if (columnNames.includes('_1')) {
      // Look for description in _1 column
      const descCol = row['_1'];
      if (descCol && descCol.trim().length > 0) {
        return descCol;
      }
    }
    
    if (columnNames.includes('_12') || columnNames.includes('_14')) {
      // Look for amount in _12 (debit) or _14 (credit) columns
      const debitCol = row['_12'];
      const creditCol = row['_14'];
      
      // Clean and check debit amount
      if (debitCol && debitCol.trim()) {
        const debitAmount = parseFloat(debitCol.replace(/[,\s]/g, ''));
        if (!isNaN(debitAmount) && debitAmount > 0) {
          return 'DEBIT:' + debitAmount.toString(); // Mark as debit
        }
      }
      
      // Clean and check credit amount
      if (creditCol && creditCol.trim()) {
        const creditAmount = parseFloat(creditCol.replace(/[,\s]/g, ''));
        if (!isNaN(creditAmount) && creditAmount > 0) {
          return 'CREDIT:' + creditAmount.toString(); // Mark as credit
        }
      }
    }
    
    return null;
  }

  private parseDate(dateStr: string): Date | null {
    // Clean the date string
    const cleanedDate = dateStr.trim().replace(/,/g, '');
    
    // Handle DD MMM YYYY format (SBI format like "19 Oct 2015")
    const ddmmmyyyy = /^\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*$/.exec(cleanedDate);
    if (ddmmmyyyy) {
      const [, day, monthStr, year] = ddmmmyyyy;
      const monthIndex = CSVParserService.MONTH_MAP.get(monthStr.toLowerCase());
      if (monthIndex !== undefined) {
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }
    }
    
    // Handle DD/MM/YY format (common in Indian banks)
    const ddmmyy = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*/.exec(cleanedDate);
    if (ddmmyy) {
      const [, day, month, year] = ddmmyy;
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    
    // Try different date formats
    const formats = [
      // DD/MM/YYYY (Indian format)
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // MM-DD-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    ];

    // Try manual parsing
    for (const format of formats) {
      const match = cleanedDate.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        
        // For DD/MM/YYYY format (most common in Indian banks)
        if (parseInt(p1) <= 31 && parseInt(p2) <= 12 && parseInt(p3) > 31) {
          return new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1)); // DD/MM/YYYY
        }
        
        // Try different interpretations
        const attempts = [
          new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1)), // DD/MM/YYYY (Indian format)
          new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2)), // MM/DD/YYYY
          new Date(parseInt(p1), parseInt(p2) - 1, parseInt(p3)), // YYYY/MM/DD,
        ];
        
        for (const attempt of attempts) {
          if (!isNaN(attempt.getTime())) {
            return attempt;
          }
        }
      }
    }

    return null;
  }

  private parseAmount(amountStr: string): number {
    // Handle our custom DEBIT/CREDIT markers
    if (amountStr.startsWith('DEBIT:')) {
      return -parseFloat(amountStr.replace('DEBIT:', ''));
    }
    if (amountStr.startsWith('CREDIT:')) {
      return parseFloat(amountStr.replace('CREDIT:', ''));
    }
    
    // Remove quotes, Indian currency symbols (₹, Rs, INR) and extra whitespace
    let cleaned = amountStr.replace(/["']/g, ''); // Remove quotes
    cleaned = cleaned.replace(/[₹$\s]/g, '');
    cleaned = cleaned.replace(/Rs\.?/gi, '');
    cleaned = cleaned.replace(/INR/gi, '');
    
    // Handle Indian lakh/crore notation (remove commas in Indian format)
    // Indian format: 1,23,45,678.90 or "50,000.00"
    cleaned = cleaned.replace(/,/g, '');
    
    // Handle parentheses as negative (accounting format)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      return -parseFloat(cleaned.slice(1, -1));
    }
    
    // Handle Dr/Cr notation (Debit/Credit)
    if (cleaned.toLowerCase().includes('dr')) {
      cleaned = cleaned.replace(/dr/gi, '');
      return -Math.abs(parseFloat(cleaned));
    }
    
    if (cleaned.toLowerCase().includes('cr')) {
      cleaned = cleaned.replace(/cr/gi, '');
      return Math.abs(parseFloat(cleaned));
    }
    
    return parseFloat(cleaned);
  }

  private extractMerchantFromDescription(description: string): string | null {
    // Common Indian banking prefixes to remove
    const prefixes = [
      'UPI-', 'IMPS-', 'NEFT-', 'RTGS-', 'POS ', 'ATM ', 'NET BANKING',
      'MOBILE BANKING', 'PHONE BANKING', 'INTERNET BANKING',
      'BY TRANSFER-', 'TO TRANSFER-', 'FT ', 'BIL/'
    ];
    
    let cleaned = description;
    
    // Remove common prefixes
    for (const prefix of prefixes) {
      if (cleaned.toUpperCase().startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length);
        break;
      }
    }
    
    // Remove reference numbers and transaction IDs (common pattern: numbers after hyphen)
    cleaned = cleaned.replace(/-\d+/g, '');
    cleaned = cleaned.replace(/\d{10,}/g, ''); // Remove long numbers (account numbers)
    
    // Extract merchant name (first few meaningful words)
    const words = cleaned.trim().split(/\s+/).filter(word => 
      word.length > 2 && !word.match(/^\d+$/) // Filter out short words and pure numbers
    );
    
    if (words.length >= 1) {
      return words.slice(0, Math.min(3, words.length)).join(' ');
    }
    
    return null;
  }

  // Custom mapping for when auto-detection fails
  parseWithCustomMapping(
    csvText: string, 
    mapping: {
      dateColumn: string;
      descriptionColumn: string;
      amountColumn: string;
      merchantColumn?: string;
      typeColumn?: string;
    },
    userSource?: string
  ): Promise<ParsedTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as CSVRow[];
            
            const transactions = data.map(row => {
              try {
                const dateValue = row[mapping.dateColumn];
                const date = this.parseDate(dateValue);
                if (!date) return null;

                const description = row[mapping.descriptionColumn] || 'Unknown Transaction';
                const amountValue = row[mapping.amountColumn];
                const amount = this.parseAmount(amountValue);
                
                if (isNaN(amount)) return null;

                const merchant = mapping.merchantColumn ? row[mapping.merchantColumn] : null;
                const type = this.determineTransactionType(description, amount);
                const source = userSource || 'Manual Mapping';

                return {
                  date: date.toISOString().split('T')[0],
                  description: description.trim(),
                  amount: Math.abs(amount),
                  merchant: merchant?.trim(),
                  type,
                  source,
                  originalData: row
                } as ParsedTransaction;
              } catch (error) {
                return null;
              }
            }).filter(Boolean) as ParsedTransaction[];

            resolve(transactions);
          } catch (error) {
            reject(error);
          }
        },
        error: reject
      });
    });
  }

  private getTransactionSource(format: CSVFormat | null): string {
    if (!format) return 'Unknown';
    
    const sourceMap: Record<string, string> = {
      'SBI': 'SBI Savings Account',
      'HDFC Bank': 'HDFC Savings Account', 
      'ICICI Bank': 'ICICI Savings Account',
      'Axis Bank': 'Axis Savings Account',
      'Kotak Bank': 'Kotak Savings Account',
      'PNB': 'PNB Savings Account',
      'BOB': 'Bank of Baroda Savings Account',
      'Generic': 'Bank Statement'
    };
    
    return sourceMap[format.name] || `${format.name} Account`;
  }

  private determineTransactionType(description: string, amount: number): 'income' | 'expense' | 'asset' {
    const desc = description.toLowerCase();
    
    // Asset purchase patterns (negative amounts that should be treated as assets)
    const assetPurchasePatterns = [
      'zerodha', 'groww', 'sip', 'mutual fund', 'stock purchase', 'equity buy', 'share buy',
      'ppf', 'epf', 'nps', 'fixed deposit', 'fd', 'gold purchase', 'crypto', 'bitcoin',
      'investment', 'systematic investment plan', 'lumpsum', 'elss',
      // Farm assets
      'tractor', 'farm equipment', 'harvester', 'irrigation', 'bore well', 'farm land',
      'livestock purchase', 'cattle purchase', 'farm building', 'solar panel'
    ];
    
    // Asset sale patterns (positive amounts from selling assets)
    const assetSalePatterns = [
      'stock sale', 'equity sell', 'share sell', 'mutual fund redemption', 'mf redemption',
      'fd maturity', 'fixed deposit maturity', 'gold sale', 'crypto sale', 'profit booking',
      // Farm asset sales
      'farm land sale', 'tractor sale', 'livestock sale', 'cattle sale', 'equipment sale'
    ];
    
    // Income patterns (positive amounts that are truly income)
    const incomePatterns = [
      'salary', 'dividend', 'divd', 'interest', 'bonus', 'freelance', 'capital gain',
      'ltcg', 'stcg', 'rent received',
      // Farm income
      'crop sales', 'harvest', 'milk sales', 'dairy income', 'farm revenue', 'agricultural income',
      'livestock income', 'subsidy', 'farm rental'
    ];
    
    // Check for asset transactions first
    if (assetPurchasePatterns.some(pattern => desc.includes(pattern))) {
      return 'asset';
    }
    
    if (assetSalePatterns.some(pattern => desc.includes(pattern))) {
      return 'asset';
    }
    
    // Check for income patterns
    if (incomePatterns.some(pattern => desc.includes(pattern))) {
      return 'income';
    }
    
    // Default behavior: positive amounts are income, negative are expenses
    return amount >= 0 ? 'income' : 'expense';
  }
}

export const csvParserService = new CSVParserService();