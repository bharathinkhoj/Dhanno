import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().optional(),
  type: z.enum(['income', 'expense', 'investment', 'asset']),
  parentId: z.string().optional(),
});

// Get all categories
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId! },
      include: {
        children: true,
        parent: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const category = await prisma.category.create({
      data: {
        ...data,
        userId: req.userId!,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.partial().parse(req.body);

    const existingCategory = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent deletion of default categories
    if (category.isDefault) {
      return res.status(400).json({ error: 'Default categories cannot be deleted' });
    }

    // Check if category has transactions
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: req.params.id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${transactionCount} associated transactions. Please recategorize these transactions first.` 
      });
    }

    // Check if category has children
    const childrenCount = await prisma.category.count({
      where: { parentId: req.params.id },
    });

    if (childrenCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${childrenCount} subcategories. Please delete subcategories first.` 
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
