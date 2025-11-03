import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all assets for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const assets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Get asset by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({
      where: { 
        id,
        userId 
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// Create new asset
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name,
      category,
      subCategory,
      currentValue,
      purchaseValue,
      purchaseDate,
      quantity,
      description,
      location,
    } = req.body;

    // Validate required fields
    if (!name || !category || currentValue === undefined || currentValue === null) {
      return res.status(400).json({ error: 'Missing required fields: name, category, currentValue' });
    }

    // Validate numeric values
    const parsedCurrentValue = parseFloat(currentValue);
    if (isNaN(parsedCurrentValue) || parsedCurrentValue <= 0) {
      return res.status(400).json({ error: 'currentValue must be a positive number' });
    }

    const asset = await prisma.asset.create({
      data: {
        userId,
        name: name.trim(),
        category,
        subCategory: subCategory || null,
        currentValue: parsedCurrentValue,
        purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        quantity: quantity ? parseFloat(quantity) : null,
        description: description || null,
        location: location || null,
      },
    });

    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// Update asset
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      name,
      category,
      subCategory,
      currentValue,
      purchaseValue,
      purchaseDate,
      quantity,
      description,
      location,
      isActive,
    } = req.body;

    const asset = await prisma.asset.updateMany({
      where: { 
        id,
        userId 
      },
      data: {
        name,
        category,
        subCategory,
        currentValue: parseFloat(currentValue),
        purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        quantity: quantity ? parseFloat(quantity) : null,
        description,
        location,
        isActive: isActive !== undefined ? isActive : true,
        lastUpdated: new Date(),
      },
    });

    if (asset.count === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Return updated asset
    const updatedAsset = await prisma.asset.findUnique({
      where: { id }
    });

    res.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// Delete asset
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const asset = await prisma.asset.deleteMany({
      where: { 
        id,
        userId 
      },
    });

    if (asset.count === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Get asset summary by category
router.get('/summary/categories', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    const assets = await prisma.asset.findMany({
      where: { 
        userId,
        isActive: true 
      },
    });

    // Group by category and calculate totals
    const categoryTotals = assets.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = {
          category: asset.category,
          totalValue: 0,
          count: 0,
          assets: []
        };
      }
      
      acc[asset.category].totalValue += asset.currentValue;
      acc[asset.category].count += 1;
      acc[asset.category].assets.push({
        id: asset.id,
        name: asset.name,
        subCategory: asset.subCategory,
        currentValue: asset.currentValue,
        quantity: asset.quantity
      });

      return acc;
    }, {} as any);

    // Convert to array and calculate total portfolio value
    const categorySummary = Object.values(categoryTotals);
    const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);

    res.json({
      categories: categorySummary,
      totalPortfolioValue,
      totalAssets: assets.length
    });
  } catch (error) {
    console.error('Error fetching asset summary:', error);
    res.status(500).json({ error: 'Failed to fetch asset summary' });
  }
});

export default router;