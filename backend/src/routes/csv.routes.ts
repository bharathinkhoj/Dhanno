import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { csvParserService } from '../services/csv-parser.service';
import { ollamaService } from '../services/ollama.service';
import { prisma } from '../lib/prisma';
import { handleAssetTransaction } from '../utils/asset-transaction-handler';

const router = Router();

// Configure multer for CSV uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Test authentication
router.get('/test-auth', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Authentication working', userId: req.userId });
});

// Preview CSV file
router.post('/preview', authenticateToken, upload.single('csvFile'), async (req: AuthRequest, res: Response) => {
  try {
    const { source } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const result = await csvParserService.parseCSV(csvText, source);

    res.json({
      format: result.format?.name,
      headers: result.headers,
      preview: result.preview,
      transactionCount: result.transactions.length,
      sampleTransactions: result.transactions.slice(0, 3),
    });
  } catch (error) {
    console.error('Error previewing CSV:', error);
    res.status(500).json({ error: 'Failed to parse CSV file' });
  }
});

// Import CSV with auto-categorization
router.post('/import', authenticateToken, upload.single('csvFile'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const { customMapping, skipDuplicates = true, source } = req.body;
    const csvText = req.file.buffer.toString('utf-8');

    let transactions;
    
    if (customMapping) {
      // Use custom column mapping
      const mapping = JSON.parse(customMapping);
      transactions = await csvParserService.parseWithCustomMapping(csvText, mapping, source);
    } else {
      // Use auto-detection
      const result = await csvParserService.parseCSV(csvText, source);
      transactions = result.transactions;
    }

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in CSV' });
    }

    // Get user's categories for AI categorization
    const userCategories = await prisma.category.findMany({
      where: { userId: req.userId! },
      select: { id: true, name: true, type: true },
    });

    // Check for duplicates if enabled - use Set for O(1) lookup
    let duplicateCheckSet = new Set<string>();
    if (skipDuplicates) {
      const existingTransactions = await prisma.transaction.findMany({
        where: {
          userId: req.userId!,
          date: {
            in: transactions.map(t => new Date(t.date)),
          },
        },
        select: { date: true, description: true, amount: true },
      });
      
      // Create hash set for fast duplicate detection
      duplicateCheckSet = new Set(
        existingTransactions.map(t => 
          `${t.date.toISOString().split('T')[0]}|${t.description.toLowerCase()}|${t.amount.toFixed(2)}`
        )
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      categorized: 0,
    };

    // Process transactions in batches
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (transaction) => {
        try {
          // Check for duplicate using optimized hash lookup
          if (skipDuplicates) {
            const transactionHash = `${transaction.date}|${transaction.description.toLowerCase()}|${transaction.amount.toFixed(2)}`;
            
            if (duplicateCheckSet.has(transactionHash)) {
              results.skipped++;
              return;
            }
          }

          // AI Categorization
          let categoryId: string | undefined;
          let llmCategorized = false;
          let llmConfidence: number | undefined;

          const categoriesForType = userCategories.filter(c => c.type === transaction.type);
          
          if (categoriesForType.length > 0) {
            try {
              const suggestion = await ollamaService.categorizeTransaction(
                transaction.description,
                transaction.merchant || null,
                transaction.amount,
                categoriesForType.map(c => c.name),
                req.userId! // Enable learning
              );

              const selectedCategory = categoriesForType.find(c => c.name === suggestion.category);
              if (selectedCategory) {
                categoryId = selectedCategory.id;
                llmCategorized = true;
                llmConfidence = suggestion.confidence;
                results.categorized++;
              }
            } catch (error) {
              console.error('AI categorization failed for transaction:', error);
            }
          }

          // Create transaction
          const createdTransaction = await prisma.transaction.create({
            data: {
              date: new Date(transaction.date),
              description: transaction.description,
              amount: transaction.amount,
              merchant: transaction.merchant,
              type: transaction.type,
              categoryId,
              userId: req.userId!,
              llmCategorized,
              llmConfidence,
              source: transaction.source,
            },
            include: {
              category: true,
            },
          });

          // Handle automatic asset creation for asset transactions
          if (transaction.type === 'asset' && createdTransaction.category) {
            await handleAssetTransaction(createdTransaction, req.userId!);
          }

          results.imported++;
        } catch (error) {
          console.error('Failed to import transaction:', error, transaction);
          results.failed++;
        }
      }));
    }

    res.json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV file' });
  }
});

// Import with custom mapping
router.post('/import-custom', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { csvData, mapping } = req.body;

    if (!csvData || !mapping) {
      return res.status(400).json({ error: 'CSV data and column mapping required' });
    }

    const transactions = await csvParserService.parseWithCustomMapping(csvData, mapping);

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found' });
    }

    // Similar processing as above but with custom mapping
    const userCategories = await prisma.category.findMany({
      where: { userId: req.userId! },
      select: { id: true, name: true, type: true },
    });

    const results = { imported: 0, failed: 0, categorized: 0 };

    for (const transaction of transactions) {
      try {
        // AI Categorization
        let categoryId: string | undefined;
        let llmCategorized = false;
        let llmConfidence: number | undefined;

        const categoriesForType = userCategories.filter(c => c.type === transaction.type);
        
        if (categoriesForType.length > 0) {
          const suggestion = await ollamaService.categorizeTransaction(
            transaction.description,
            transaction.merchant || null,
            transaction.amount,
            categoriesForType.map(c => c.name),
            req.userId! // Enable learning
          );

          const selectedCategory = categoriesForType.find(c => c.name === suggestion.category);
          if (selectedCategory) {
            categoryId = selectedCategory.id;
            llmCategorized = true;
            llmConfidence = suggestion.confidence;
            results.categorized++;
          }
        }

        await prisma.transaction.create({
          data: {
            date: new Date(transaction.date),
            description: transaction.description,
            amount: transaction.amount,
            merchant: transaction.merchant,
            type: transaction.type,
            categoryId,
            userId: req.userId!,
            llmCategorized,
            llmConfidence,
          },
        });

        results.imported++;
      } catch (error) {
        console.error('Failed to import transaction:', error);
        results.failed++;
      }
    }

    res.json({
      message: `Custom import completed: ${results.imported} imported, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error with custom import:', error);
    res.status(500).json({ error: 'Failed to import with custom mapping' });
  }
});

export default router;