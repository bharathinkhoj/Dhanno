import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { ollamaService } from '../services/ollama.service';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { handleAssetTransaction } from '../utils/asset-transaction-handler';

const router = Router();

// Validation schemas
const createTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  merchant: z.string().optional(),
  type: z.enum(['income', 'expense', 'asset']),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
});

const updateTransactionSchema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  merchant: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
});

// Get all transactions for user with search, sort, and pagination
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      categoryId, 
      type, 
      search, 
      sortBy = 'date', 
      sortOrder = 'desc',
      page = '1',
      limit = '10',
      amountMin,
      amountMax
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      userId: req.userId!,
      ...(startDate && endDate ? {
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      } : {}),
      ...(categoryId ? { categoryId: categoryId as string } : {}),
      ...(type ? { type: type as string } : {}),
    };

    // Add amount range filtering
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) where.amount.gte = parseFloat(amountMin as string);
      if (amountMax) where.amount.lte = parseFloat(amountMax as string);
    }

    // Add search functionality
    if (search) {
      const searchTerm = search as string;
      const searchConditions: any[] = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { merchant: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } }
      ];

      // Check if search term is a number for amount search
      const numericSearch = parseFloat(searchTerm);
      if (!isNaN(numericSearch)) {
        // Add exact amount match
        searchConditions.push({ amount: numericSearch });
        
        // For partial amount matching (e.g., searching "200" matches "2000", "1200", etc.)
        if (numericSearch >= 10) {
          // Match amounts that contain this number (like 200 matching 2000, 1200)
          searchConditions.push({ amount: { gte: numericSearch, lt: numericSearch * 10 } });
        }
        if (numericSearch <= 9999) {
          // Match amounts where this could be a substring (like 200 matching 200.50)
          searchConditions.push({ amount: { gte: numericSearch - 0.01, lte: numericSearch + 999 } });
        }
      }

      where.OR = searchConditions;
    }

    // Build orderBy clause
    let orderBy: any = { date: 'desc' }; // default
    
    if (sortBy === 'amount') {
      orderBy = { amount: sortOrder };
    } else if (sortBy === 'description') {
      orderBy = { description: sortOrder };
    } else if (sortBy === 'type') {
      orderBy = { type: sortOrder };
    } else if (sortBy === 'category') {
      orderBy = { category: { name: sortOrder } };
    } else if (sortBy === 'date') {
      orderBy = { date: sortOrder };
    }

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });
    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy,
      skip: offset,
      take: limitNum,
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      transactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
      },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction with LLM categorization
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    
    let categoryId = data.categoryId;
    let llmCategorized = false;
    let llmConfidence: number | undefined;

    // If no category provided, use LLM to categorize
    if (!categoryId) {
      const userCategories = await prisma.category.findMany({
        where: { userId: req.userId!, type: data.type },
        select: { id: true, name: true },
      });

      if (userCategories.length > 0) {
        const suggestion = await ollamaService.categorizeTransaction(
          data.description,
          data.merchant || null,
          data.amount,
          userCategories.map(c => c.name)
        );

        const selectedCategory = userCategories.find(
          c => c.name === suggestion.category
        );

        if (selectedCategory) {
          categoryId = selectedCategory.id;
          llmCategorized = true;
          llmConfidence = suggestion.confidence;
        }
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId: req.userId!,
        categoryId,
        llmCategorized,
        llmConfidence,
      },
      include: {
        category: true,
      },
    });

    // Automatically create or update asset record for asset transactions
    if (data.type === 'asset' && transaction.category) {
      await handleAssetTransaction(transaction, req.userId!);
    }

    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTransactionSchema.parse(req.body);
    
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Track if user is correcting LLM categorization
    const updateData: any = {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    };

    if (data.categoryId && existingTransaction.llmCategorized && 
        data.categoryId !== existingTransaction.categoryId) {
      updateData.originalCategory = existingTransaction.categoryId;
    }

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        category: true,
      },
    });

    res.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Bulk categorize transactions using LLM
router.post('/bulk-categorize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionIds } = req.body as { transactionIds: string[] };

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs array required' });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: req.userId!,
        categoryId: null,
      },
    });

    const userCategories = await prisma.category.findMany({
      where: { userId: req.userId! },
      select: { id: true, name: true, type: true },
    });

    const results = await Promise.all(
      transactions.map(async (transaction) => {
        const categoriesForType = userCategories.filter(
          c => c.type === transaction.type
        );

        if (categoriesForType.length === 0) return null;

        const suggestion = await ollamaService.categorizeTransaction(
          transaction.description,
          transaction.merchant,
          transaction.amount,
          categoriesForType.map(c => c.name)
        );

        const selectedCategory = categoriesForType.find(
          c => c.name === suggestion.category
        );

        if (selectedCategory) {
          return prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              categoryId: selectedCategory.id,
              llmCategorized: true,
              llmConfidence: suggestion.confidence,
            },
          });
        }

        return null;
      })
    );

    const updated = results.filter(r => r !== null);
    res.json({ 
      message: `Categorized ${updated.length} transactions`,
      updated: updated.length 
    });
  } catch (error) {
    console.error('Error bulk categorizing:', error);
    res.status(500).json({ error: 'Failed to bulk categorize' });
  }
});

export default router;
