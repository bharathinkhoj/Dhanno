import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { recategorizationService } from '../services/recategorization.service';

const router = Router();

// Recategorize all transactions for the user
router.post('/recategorize-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const result = await recategorizationService.recategorizeAllTransactions(req.userId);
    
    res.json({
      message: `Successfully recategorized ${result.updated} out of ${result.total} transactions`,
      ...result
    });
  } catch (error) {
    console.error('Error recategorizing all transactions:', error);
    res.status(500).json({ error: 'Failed to recategorize transactions' });
  }
});

// Recategorize a single transaction
router.post('/recategorize/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await recategorizationService.recategorizeTransaction(id);
    
    if (success) {
      res.json({ message: 'Transaction recategorized successfully' });
    } else {
      res.status(400).json({ error: 'Could not recategorize transaction (low confidence or no suitable category)' });
    }
  } catch (error) {
    console.error('Error recategorizing transaction:', error);
    res.status(500).json({ error: 'Failed to recategorize transaction' });
  }
});

export default router;