import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { learningService } from '../services/learning.service';
import { prisma } from '../lib/prisma';

const router = Router();

// Update transaction category manually (this will be learned from)
router.put('/:id/category', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Get the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.userId!
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify the category belongs to the user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [
          { userId: req.userId! },
          { isDefault: true }
        ]
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Update the transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId,
        llmCategorized: false, // Mark as manually corrected
        llmConfidence: null
      },
      include: { category: true }
    });

    // Record this as a learning pattern
    await learningService.recordUserCorrection(
      req.userId!,
      transaction.description,
      transaction.merchant,
      categoryId,
      1.0 // Maximum confidence for user corrections
    );

    res.json({
      message: 'Transaction category updated and learned for future use',
      transaction: updatedTransaction
    });

  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Get learning patterns for the user
router.get('/patterns', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const patterns = await learningService.getUserPatterns(req.userId!);
    res.json({ patterns });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch learning patterns' });
  }
});

// Get learning statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await learningService.getCategoryStats(req.userId!);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Cleanup old patterns
router.delete('/patterns/cleanup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { days = 90 } = req.query;
    const cleanedCount = await learningService.cleanupOldPatterns(
      req.userId!,
      parseInt(days as string)
    );
    
    res.json({
      message: `Cleaned up ${cleanedCount} old patterns`,
      cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up patterns:', error);
    res.status(500).json({ error: 'Failed to cleanup patterns' });
  }
});

export default router;