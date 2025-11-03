interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning?: string;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  }

  async categorizeTransaction(
    description: string,
    merchant: string | null,
    amount: number,
    availableCategories: string[],
    userId?: string
  ): Promise<CategorySuggestion> {
    // 1. First check learned patterns if userId provided
    if (userId) {
      const { learningService } = await import('./learning.service');
      const learnedMatch = await learningService.findSimilarPattern(userId, description, merchant);
      
      if (learnedMatch && learnedMatch.confidence > 0.8) {
        return {
          category: learnedMatch.categoryName,
          confidence: learnedMatch.confidence,
          reasoning: `Learned from previous ${learnedMatch.matchType} match`
        };
      }
    }

    // 2. Pre-processing: Check for obvious patterns
    const quickMatch = this.quickCategorize(description, merchant, availableCategories);
    if (quickMatch) {
      return quickMatch;
    }

    // 3. Use AI as fallback
    const prompt = this.buildCategorizationPrompt(
      description,
      merchant,
      amount,
      availableCategories
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent categorization
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return this.parseCategorizationResponse(data.response, availableCategories);
    } catch (error) {
      console.error('Error calling Ollama:', error);
      // Fallback to a default category
      return {
        category: availableCategories[0] || 'Uncategorized',
        confidence: 0.1,
        reasoning: 'Failed to get LLM categorization',
      };
    }
  }

  private buildCategorizationPrompt(
    description: string,
    merchant: string | null,
    amount: number,
    categories: string[]
  ): string {
    return `You are a financial transaction categorization assistant for Indian users. Analyze the following transaction and suggest the most appropriate category.

Transaction Details:
- Description: ${description}
- Merchant: ${merchant || 'Unknown'}
- Amount: ₹${amount.toFixed(2)}

Available Categories:
${categories.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')}

Context: This is an Indian banking transaction. Use these SPECIFIC patterns for accurate categorization:

GROCERIES & FOOD:
- Keywords: GROCERIES, FOOD, SWIGGY, ZOMATO, BIGBASKET, DMART, GROFERS, AMAZON-GROCERIES, FRESH, VEGETABLES, FRUITS
- Merchants: BigBasket, DMart, More Supermarket, Reliance Fresh, Spencer's

UTILITIES & BILLS:
- Keywords: ELECTRICITY, WATER, GAS, BILL, RECHARGE, DTH, BROADBAND, POSTPAID, PREPAID
- Merchants: BSES, Airtel, Jio, Vi, Tata Sky, Dish TV, MTNL, BSNL

TRANSPORTATION:
- Keywords: OLA, UBER, AUTO, TAXI, METRO, BUS, PETROL, DIESEL, FUEL
- Merchants: Ola, Uber, BMTC, Delhi Metro, Indian Oil, HP Petrol, Bharat Petroleum

MOBILE & INTERNET:
- Keywords: MOBILE, INTERNET, BROADBAND, WIFI, DATA, RECHARGE, POSTPAID, PREPAID
- Merchants: Airtel, Jio, Vi, BSNL, MTNL, ACT Fibernet

SHOPPING:
- Keywords: AMAZON (not groceries), FLIPKART, MYNTRA, CLOTHING, ELECTRONICS, BOOKS
- Merchants: Amazon (non-grocery), Flipkart, Myntra, Ajio, Nykaa

ASSET CATEGORIES (NOT EXPENSES/INCOME):
- ASSET PURCHASE: Stock Purchase, Mutual Fund Purchase, Bond Purchase, Gold Purchase, Crypto Purchase, Real Estate Purchase, PPF Contribution, EPF Contribution, NPS Contribution, Fixed Deposit
- ASSET SALE: Stock Sale, Mutual Fund Redemption, Bond Sale, Gold Sale, Crypto Sale, Real Estate Sale, FD Maturity
- INCOME (from assets): Dividend Income, Capital Gains, Interest Income

SPECIFIC PATTERNS:
- ZERODHA transactions → Stock Purchase (if buying) or Stock Sale (if selling)
- GROWW SIP/Lumpsum → Mutual Fund Purchase
- GROWW Redemption → Mutual Fund Redemption
- PPF/EPF/NPS contributions → respective asset categories
- Company dividends → Dividend Income (NOT asset purchase)
- Capital gains from sales → Capital Gains (NOT asset sale)

FARM HOUSE CATEGORIES:
- FARM INCOME: Crop Sales, Livestock Income, Farm Rental Income, Agricultural Subsidies, Farm Revenue
- FARM EXPENSES: Farm Labor, Seeds & Fertilizers, Farm Fuel & Energy, Irrigation & Water, Pesticides & Chemicals, Farm Maintenance, Livestock Feed, Veterinary Services
- FARM ASSETS: Farm Land Purchase, Farm Equipment Purchase, Irrigation System, Farm Buildings, Livestock Purchase, Solar Panels (Farm), Bore Well Installation, Farm Vehicles

FARM PATTERNS:
- Crop harvest/sales → Crop Sales (income)
- Tractor/equipment purchase → Farm Equipment Purchase (asset)
- Seeds/fertilizers → Seeds & Fertilizers (expense)
- Farm labor/workers → Farm Labor (expense)

BANKING & CREDIT CARD FEES:
- Keywords: CHARGES, FEE, ANNUAL FEE, ATM, MAINTENANCE, PROCESSING, LATE PAYMENT, SMS, EMAIL, NEFT, RTGS, IMPS, DEMAT, OVERDRAFT, FOREIGN TRANSACTION
- Merchants: SBI-CHARGES, HDFC-FEE, ICICI-CHARGES, AXIS-FEE, Credit Card companies
- Patterns: Account maintenance, ATM withdrawal charges, Credit card fees, Online transaction charges, SMS/email charges, NEFT/RTGS charges, Demat account charges, Loan processing fees

MISCELLANEOUS EXPENSES:
- Keywords: GIFT, DONATION, PET, SUBSCRIPTION, NETFLIX, PRIME, SPOTIFY, REPAIR, MAINTENANCE, LEGAL, BOOKS, MAGAZINE, OTHER
- Merchants: Netflix, Amazon Prime, Spotify, Swiggy One, Zomato Pro, Legal firms, Pet stores
- Patterns: Subscription services, Pet-related expenses, Gifts and donations, Repair and maintenance, Legal and professional services, Books and magazines

MISCELLANEOUS INCOME:
- Keywords: CASHBACK, REWARD, REFUND, GIFT, PRIZE, REIMBURSEMENT, FOUND, COMPETITION
- Merchants: Cashback from apps, Refunds from merchants, Gift money transfers
- Patterns: Cashback and rewards, Refunds from purchases, Gift money received, Competition prizes, Expense reimbursements
- Irrigation/bore well → Irrigation System (asset) or Irrigation & Water (expense)
- Livestock purchase → Livestock Purchase (asset)
- Livestock sale/milk → Livestock Income (income)

CRITICAL CATEGORIZATION RULES:
1. If description contains "GROCERIES", "FOOD", or food-related merchants → ALWAYS use "Groceries & Food"
2. If description contains "ELECTRICITY", "WATER", "GAS", "BILL" → ALWAYS use "Utilities & Bills"
3. If description contains "ZERODHA" → ASSET CATEGORY: "Stock Purchase" (buying) or "Stock Sale" (selling) - NOT expense
4. If description contains "GROWW" → ASSET CATEGORY: "Mutual Fund Purchase" (SIP/lumpsum) or "Mutual Fund Redemption" - NOT expense
5. If description contains "DIVIDEND", "DIVD" → INCOME: "Dividend Income" - NOT asset purchase
6. If description contains "PPF", "EPF", "NPS" → ASSET CATEGORY: respective contribution categories
7. If description contains "CAPITAL GAIN", "LTCG", "STCG" → INCOME: "Capital Gains"
8. If description contains "RECHARGE", "PREPAID", "POSTPAID" → Check if mobile/DTH/broadband
9. Investment purchases are ASSETS (increase net worth), not expenses (decrease net worth)

Instructions:
1. FIRST check if description matches any CRITICAL RULES above
2. Look for EXACT keyword matches from the patterns listed
3. Consider the merchant name and amount to validate category choice
4. For ambiguous cases, choose the most specific category available
5. Provide confidence score: 0.9+ for exact matches, 0.7+ for strong patterns, 0.5+ for weak matches
6. Respond ONLY in this exact JSON format:

{
  "category": "Category Name",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}

Response:`;
  }

  private parseCategorizationResponse(
    response: string,
    availableCategories: string[]
  ): CategorySuggestion {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the category exists
        const normalizedCategory = this.findClosestCategory(
          parsed.category,
          availableCategories
        );

        return {
          category: normalizedCategory,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
          reasoning: parsed.reasoning || '',
        };
      }
    } catch (error) {
      console.error('Error parsing LLM response:', error);
    }

    // Fallback
    return {
      category: availableCategories[0] || 'Uncategorized',
      confidence: 0.1,
      reasoning: 'Could not parse LLM response',
    };
  }

  private findClosestCategory(
    suggestedCategory: string,
    availableCategories: string[]
  ): string {
    const normalized = suggestedCategory.toLowerCase().trim();
    
    // Exact match
    const exactMatch = availableCategories.find(
      cat => cat.toLowerCase() === normalized
    );
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = availableCategories.find(cat =>
      cat.toLowerCase().includes(normalized) || normalized.includes(cat.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Default to first category
    return availableCategories[0] || 'Uncategorized';
  }

  private quickCategorize(
    description: string,
    merchant: string | null,
    availableCategories: string[]
  ): CategorySuggestion | null {
    const desc = description.toLowerCase();
    const merch = merchant?.toLowerCase() || '';

    // Define pattern mappings with high confidence
    const patterns = [
      // Groceries & Food patterns
      {
        keywords: ['groceries', 'grocery', 'food', 'swiggy', 'zomato', 'bigbasket', 'dmart', 'grofers', 'fresh'],
        category: 'Groceries & Food',
        confidence: 0.95
      },
      // Utilities & Bills patterns
      {
        keywords: ['electricity', 'water', 'gas', 'bill', 'bses', 'tata power', 'adani'],
        category: 'Utilities & Bills',
        confidence: 0.95
      },
      // Mobile & Internet patterns
      {
        keywords: ['recharge', 'prepaid', 'postpaid', 'airtel', 'jio', 'vi', 'bsnl', 'mtnl'],
        category: 'Mobile & Internet',
        confidence: 0.95
      },
      // Transportation patterns
      {
        keywords: ['ola', 'uber', 'auto', 'taxi', 'metro', 'petrol', 'diesel', 'fuel', 'iocl', 'bpcl', 'hpcl'],
        category: 'Transportation',
        confidence: 0.95
      },
      // Asset Purchase - Stock patterns
      {
        keywords: ['zerodha', 'stock purchase', 'equity buy', 'share buy', 'kite', 'upstox', 'angel broking'],
        category: 'Stock Purchase', // Asset category
        confidence: 0.95
      },
      // Asset Purchase - Mutual Fund patterns
      {
        keywords: ['groww', 'sip', 'systematic investment', 'mutual fund', 'mf purchase', 'elss', 'lumpsum'],
        category: 'Mutual Fund Purchase', // Asset category
        confidence: 0.95
      },
      // Banking & Credit Card Fees patterns
      {
        keywords: ['charges', 'fee', 'annual fee', 'maintenance fee', 'atm charges', 'sms charges', 'neft charges', 'rtgs charges', 'processing fee', 'late payment', 'overdraft', 'foreign transaction', 'demat charges'],
        category: 'Banking & Credit Card Fees',
        confidence: 0.95
      },
      // Miscellaneous Expenses patterns
      {
        keywords: ['netflix', 'amazon prime', 'spotify', 'subscription', 'gift', 'donation', 'pet', 'repair', 'maintenance', 'legal', 'books', 'magazine'],
        category: 'Miscellaneous Expenses',
        confidence: 0.90
      },
      // Miscellaneous Income patterns
      {
        keywords: ['cashback', 'reward', 'refund', 'gift money', 'prize', 'reimbursement', 'found money', 'competition'],
        category: 'Miscellaneous Income',
        confidence: 0.90
      },
      // Asset Sale - Stock patterns
      {
        keywords: ['stock sale', 'equity sell', 'share sell', 'sell order', 'profit booking'],
        category: 'Stock Sale', // Asset category
        confidence: 0.95
      },
      // Asset Sale - Mutual Fund patterns
      {
        keywords: ['mf redemption', 'mutual fund redemption', 'fund withdrawal', 'sip withdrawal'],
        category: 'Mutual Fund Redemption', // Asset category
        confidence: 0.95
      },
      // Other Asset Purchase patterns
      {
        keywords: ['ppf', 'epf contribution', 'nps', 'fixed deposit', 'fd', 'gold purchase', 'crypto purchase'],
        category: 'PPF Contribution', // Will be refined based on specific keywords
        confidence: 0.90
      },
      // Income patterns - Dividend and Capital Gains
      {
        keywords: ['dividend', 'divd', 'tcs dividend', 'infosys dividend', 'reliance dividend'],
        category: 'Dividend Income',
        confidence: 0.95
      },
      {
        keywords: ['capital gain', 'ltcg', 'stcg', 'profit from sale'],
        category: 'Capital Gains',
        confidence: 0.95
      },
      // Farm Income patterns
      {
        keywords: ['crop sales', 'harvest', 'farm produce', 'agricultural income', 'farm revenue'],
        category: 'Crop Sales',
        confidence: 0.95
      },
      {
        keywords: ['livestock', 'cattle sale', 'milk', 'dairy', 'poultry'],
        category: 'Livestock Income',
        confidence: 0.95
      },
      {
        keywords: ['farm rent', 'land lease', 'agricultural rent'],
        category: 'Farm Rental Income',
        confidence: 0.95
      },
      {
        keywords: ['subsidy', 'agricultural subsidy', 'govt subsidy', 'crop insurance'],
        category: 'Agricultural Subsidies',
        confidence: 0.95
      },
      // Farm Expense patterns
      {
        keywords: ['seeds', 'fertilizer', 'pesticide', 'farm labor', 'irrigation'],
        category: 'Seeds & Fertilizers',
        confidence: 0.90
      },
      {
        keywords: ['tractor', 'farm equipment', 'harvester', 'plough'],
        category: 'Farm Equipment Purchase',
        confidence: 0.90
      },
      {
        keywords: ['bore well', 'water pump', 'drip irrigation', 'sprinkler'],
        category: 'Irrigation System',
        confidence: 0.90
      },
      {
        keywords: ['veterinary', 'animal feed', 'cattle feed', 'fodder'],
        category: 'Veterinary Services',
        confidence: 0.90
      }
    ];

    // Check for pattern matches
    for (const pattern of patterns) {
      const hasMatch = pattern.keywords.some(keyword => 
        desc.includes(keyword) || merch.includes(keyword)
      );
      
      if (hasMatch) {
        // Find the best matching category
        const matchingCategory = availableCategories.find(cat => 
          cat.toLowerCase().includes(pattern.category.toLowerCase()) ||
          pattern.category.toLowerCase().includes(cat.toLowerCase())
        );
        
        if (matchingCategory) {
          return {
            category: matchingCategory,
            confidence: pattern.confidence,
            reasoning: `Quick match based on keyword: ${pattern.keywords.find(k => desc.includes(k) || merch.includes(k))}`
          };
        }
      }
    }

    return null; // No quick match found
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
