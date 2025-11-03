import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// Get spending by category
router.get('/spending-by-category', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;

    const transactions = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: req.userId!,
        type: type as string,
        ...(startDate && endDate ? {
          date: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        } : {}),
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const categoryIds = transactions.map(t => t.categoryId).filter(Boolean) as string[];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const result = transactions.map(t => ({
      categoryId: t.categoryId,
      categoryName: t.categoryId ? categoryMap.get(t.categoryId)?.name : 'Uncategorized',
      color: t.categoryId ? categoryMap.get(t.categoryId)?.color : '#94a3b8',
      total: t._sum.amount || 0,
      count: t._count.id,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching spending by category:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get monthly trends
router.get('/monthly-trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { months = 12, categoryId } = req.query;
    const monthCount = parseInt(months as string);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthCount);

    const whereClause: any = {
      userId: req.userId!,
      date: { gte: startDate },
    };

    // Add category filter if specified (including subcategories)
    if (categoryId && categoryId !== 'all') {
      // First check if this category has children
      const categoryWithChildren = await prisma.category.findUnique({
        where: { id: categoryId as string },
        include: {
          children: {
            select: { id: true }
          }
        }
      });

      if (categoryWithChildren?.children && categoryWithChildren.children.length > 0) {
        // Include parent and all child categories
        const categoryIds = [categoryId as string, ...categoryWithChildren.children.map(child => child.id)];
        whereClause.categoryId = { in: categoryIds };
      } else {
        // Just this specific category
        whereClause.categoryId = categoryId as string;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      select: {
        date: true,
        amount: true,
        type: true,
      },
    });

    const monthlyData = new Map<string, { income: number; expense: number }>();

    transactions.forEach(t => {
      const monthKey = t.date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(monthKey) || { income: 0, expense: 0 };
      
      if (t.type === 'income') {
        existing.income += t.amount;
      } else {
        existing.expense += t.amount;
      }
      
      monthlyData.set(monthKey, existing);
    });

    const result = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(result);
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get category-specific monthly trends
router.get('/category-trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { months = 12, categoryIds } = req.query;
    const monthCount = parseInt(months as string);
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthCount);

    // Parse category IDs (can be comma-separated string or array)
    let selectedCategoryIds: string[] = [];
    if (categoryIds) {
      if (Array.isArray(categoryIds)) {
        selectedCategoryIds = categoryIds as string[];
      } else {
        selectedCategoryIds = (categoryIds as string).split(',').filter(id => id.trim());
      }
    }

    if (selectedCategoryIds.length === 0) {
      return res.json([]);
    }

    // Fetch categories with their details
    const categories = await prisma.category.findMany({
      where: {
        id: { in: selectedCategoryIds },
        userId: req.userId!
      },
      select: {
        id: true,
        name: true,
        color: true
      }
    });

    // Create a map for quick category lookup
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Fetch transactions for selected categories
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        date: { gte: startDate },
        categoryId: { in: selectedCategoryIds }
      },
      select: {
        date: true,
        amount: true,
        categoryId: true,
      },
    });

    // Create monthly data structure: { month: { categoryId: amount } }
    const monthlyData = new Map<string, Map<string, number>>();

    transactions.forEach(t => {
      if (!t.categoryId) return;
      
      const monthKey = t.date.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, new Map());
      }
      
      const monthData = monthlyData.get(monthKey)!;
      const currentAmount = monthData.get(t.categoryId) || 0;
      monthData.set(t.categoryId, currentAmount + Math.abs(t.amount));
    });

    // Convert to array format for charting
    const result = Array.from(monthlyData.entries())
      .map(([month, categoryAmounts]) => {
        const monthData: any = { month };
        
        // Add data for each selected category
        selectedCategoryIds.forEach(categoryId => {
          const category = categoryMap.get(categoryId);
          if (category) {
            monthData[category.name] = categoryAmounts.get(categoryId) || 0;
          }
        });
        
        return monthData;
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Also return category metadata for chart styling
    const categoryMetadata = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color
    }));

    res.json({
      data: result,
      categories: categoryMetadata
    });
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({ error: 'Failed to fetch category trends' });
  }
});

// Get summary statistics
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      userId: req.userId!,
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [income, expense, assets, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'asset' },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const totalAssetTransactions = assets._sum.amount || 0;

    // Calculate net cash flow (income - expenses, excluding asset transactions)
    const netCashFlow = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      totalAssetTransactions,
      netCashFlow,
      transactionCount,
      cashFlowRate: totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
