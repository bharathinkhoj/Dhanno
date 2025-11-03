import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Create default categories for Indian users
    const categoriesData = [
      // Expenses
      { name: 'Groceries & Food', type: 'expense', color: '#10b981', icon: '🛒' },
      { name: 'Utilities & Bills', type: 'expense', color: '#3b82f6', icon: '💡' },
      { name: 'Transportation', type: 'expense', color: '#f59e0b', icon: '🚗' },
      { name: 'Mobile & Internet', type: 'expense', color: '#06b6d4', icon: '📱' },
      { name: 'Healthcare', type: 'expense', color: '#ef4444', icon: '🏥' },
      { name: 'Education', type: 'expense', color: '#8b5cf6', icon: '📚' },
      { name: 'Rent', type: 'expense', color: '#64748b', icon: '🏠' },
      { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬' },
      { name: 'Shopping', type: 'expense', color: '#f97316', icon: '🛍️' },
      { name: 'Fuel', type: 'expense', color: '#991b1b', icon: '⛽' },
      { name: 'Insurance', type: 'expense', color: '#1e40af', icon: '🛡️' },
      { name: 'EMI/Loans', type: 'expense', color: '#7c2d12', icon: '🏦' },
      { name: 'Dining Out', type: 'expense', color: '#ea580c', icon: '🍽️' },
      { name: 'Travel', type: 'expense', color: '#0891b2', icon: '✈️' },
      { name: 'Banking & Credit Card Fees', type: 'expense', color: '#7c3aed', icon: '🏧' },
      { name: 'Miscellaneous Expenses', type: 'expense', color: '#6b7280', icon: '📋' },
      
      // Income
      { name: 'Salary', type: 'income', color: '#22c55e', icon: '💰' },
      { name: 'Rental Income', type: 'income', color: '#16a34a', icon: '🏘️' },
      { name: 'Freelancing', type: 'income', color: '#059669', icon: '💻' },
      { name: 'Interest Income', type: 'income', color: '#0ea5e9', icon: '🏛️' },
      { name: 'Bonus', type: 'income', color: '#84cc16', icon: '🎁' },
      { name: 'Other Income', type: 'income', color: '#65a30d', icon: '💵' },
      { name: 'Miscellaneous Income', type: 'income', color: '#8b5cf6', icon: '📝' },
      
      // Investment Income
      { name: 'Dividend Income', type: 'income', color: '#059669', icon: '💰' },
      { name: 'Capital Gains', type: 'income', color: '#0284c7', icon: '📈' },
      
      // Farm House Income
      { name: 'Farm Revenue', type: 'income', color: '#65a30d', icon: '🌾' },
      { name: 'Crop Sales', type: 'income', color: '#84cc16', icon: '🌽' },
      { name: 'Livestock Income', type: 'income', color: '#a3a3a3', icon: '🐄' },
      { name: 'Farm Rental Income', type: 'income', color: '#16a34a', icon: '🏡' },
      { name: 'Agricultural Subsidies', type: 'income', color: '#22c55e', icon: '🏛️' },
      
      // Farm House Operational Expenses
      { name: 'Farm Labor', type: 'expense', color: '#92400e', icon: '👨‍🌾' },
      { name: 'Seeds & Fertilizers', type: 'expense', color: '#059669', icon: '🌱' },
      { name: 'Farm Fuel & Energy', type: 'expense', color: '#dc2626', icon: '⛽' },
      { name: 'Irrigation & Water', type: 'expense', color: '#0ea5e9', icon: '💧' },
      { name: 'Pesticides & Chemicals', type: 'expense', color: '#7c2d12', icon: '🧪' },
      { name: 'Farm Maintenance', type: 'expense', color: '#6b7280', icon: '🔧' },
      { name: 'Livestock Feed', type: 'expense', color: '#a3a3a3', icon: '🥬' },
      { name: 'Veterinary Services', type: 'expense', color: '#ef4444', icon: '🩺' },
      { name: 'Farm Insurance', type: 'expense', color: '#1e40af', icon: '🛡️' },
      { name: 'Farm Transportation', type: 'expense', color: '#f59e0b', icon: '🚚' },
      
      // Asset Purchase Categories (Parent)
      { name: 'Asset Purchase', type: 'asset', color: '#dc2626', icon: '🛒' },
      { name: 'Asset Sale', type: 'asset', color: '#059669', icon: '💰' },
      
      // Investment Categories (Parent) - Legacy support
      { name: 'Equity Investments', type: 'investment', color: '#dc2626', icon: '📊' },
      { name: 'Mutual Fund Investments', type: 'investment', color: '#7c3aed', icon: '📋' },
      { name: 'Fixed Deposits', type: 'investment', color: '#059669', icon: '🏦' },
      { name: 'Other Investments', type: 'investment', color: '#4338ca', icon: '💼' },
    ];

    // Create parent categories first
    const createdCategories = [];
    for (const categoryData of categoriesData) {
      const category = await prisma.category.create({
        data: {
          ...categoryData,
          userId: user.id,
          isDefault: true,
        },
      });
      createdCategories.push(category);
    }

    // Find parent categories for subcategories
    const assetPurchaseParent = createdCategories.find(c => c.name === 'Asset Purchase');
    const assetSaleParent = createdCategories.find(c => c.name === 'Asset Sale');
    const equityParent = createdCategories.find(c => c.name === 'Equity Investments');
    const mfParent = createdCategories.find(c => c.name === 'Mutual Fund Investments');
    const fdParent = createdCategories.find(c => c.name === 'Fixed Deposits');
    const otherInvestParent = createdCategories.find(c => c.name === 'Other Investments');
    const bankingFeesParent = createdCategories.find(c => c.name === 'Banking & Credit Card Fees');
    const miscExpenseParent = createdCategories.find(c => c.name === 'Miscellaneous Expenses');
    const miscIncomeParent = createdCategories.find(c => c.name === 'Miscellaneous Income');

    // Create subcategories
    const subcategories = [
      // Asset Purchase Subcategories
      { name: 'Stock Purchase', type: 'asset', color: '#dc2626', icon: '📈', parentId: assetPurchaseParent?.id },
      { name: 'Mutual Fund Purchase', type: 'asset', color: '#7c3aed', icon: '📊', parentId: assetPurchaseParent?.id },
      { name: 'Bond Purchase', type: 'asset', color: '#059669', icon: '📜', parentId: assetPurchaseParent?.id },
      { name: 'Gold Purchase', type: 'asset', color: '#d97706', icon: '🥇', parentId: assetPurchaseParent?.id },
      { name: 'Crypto Purchase', type: 'asset', color: '#f59e0b', icon: '₿', parentId: assetPurchaseParent?.id },
      { name: 'Real Estate Purchase', type: 'asset', color: '#92400e', icon: '🏠', parentId: assetPurchaseParent?.id },
      { name: 'PPF Contribution', type: 'asset', color: '#4338ca', icon: '🛡️', parentId: assetPurchaseParent?.id },
      { name: 'EPF Contribution', type: 'asset', color: '#3730a3', icon: '👔', parentId: assetPurchaseParent?.id },
      { name: 'NPS Contribution', type: 'asset', color: '#312e81', icon: '🎯', parentId: assetPurchaseParent?.id },
      { name: 'Fixed Deposit', type: 'asset', color: '#065f46', icon: '🏦', parentId: assetPurchaseParent?.id },
      
      // Farm House Capital Expenditure (Asset Purchase)
      { name: 'Farm Land Purchase', type: 'asset', color: '#92400e', icon: '🌾', parentId: assetPurchaseParent?.id },
      { name: 'Farm Equipment Purchase', type: 'asset', color: '#7c2d12', icon: '🚜', parentId: assetPurchaseParent?.id },
      { name: 'Irrigation System', type: 'asset', color: '#0ea5e9', icon: '💧', parentId: assetPurchaseParent?.id },
      { name: 'Farm Buildings', type: 'asset', color: '#6b7280', icon: '🏚️', parentId: assetPurchaseParent?.id },
      { name: 'Livestock Purchase', type: 'asset', color: '#a3a3a3', icon: '🐄', parentId: assetPurchaseParent?.id },
      { name: 'Solar Panels (Farm)', type: 'asset', color: '#fbbf24', icon: '☀️', parentId: assetPurchaseParent?.id },
      { name: 'Bore Well Installation', type: 'asset', color: '#06b6d4', icon: '🕳️', parentId: assetPurchaseParent?.id },
      { name: 'Farm Vehicles', type: 'asset', color: '#f59e0b', icon: '🚚', parentId: assetPurchaseParent?.id },
      
      // Asset Sale Subcategories
      { name: 'Stock Sale', type: 'asset', color: '#059669', icon: '📈', parentId: assetSaleParent?.id },
      { name: 'Mutual Fund Redemption', type: 'asset', color: '#16a34a', icon: '📊', parentId: assetSaleParent?.id },
      { name: 'Bond Sale', type: 'asset', color: '#22c55e', icon: '📜', parentId: assetSaleParent?.id },
      { name: 'Gold Sale', type: 'asset', color: '#eab308', icon: '🥇', parentId: assetSaleParent?.id },
      { name: 'Crypto Sale', type: 'asset', color: '#facc15', icon: '₿', parentId: assetSaleParent?.id },
      { name: 'Real Estate Sale', type: 'asset', color: '#a3a3a3', icon: '🏠', parentId: assetSaleParent?.id },
      { name: 'FD Maturity', type: 'asset', color: '#10b981', icon: '🏦', parentId: assetSaleParent?.id },
      
      // Farm Asset Sales
      { name: 'Farm Land Sale', type: 'asset', color: '#84cc16', icon: '🌾', parentId: assetSaleParent?.id },
      { name: 'Farm Equipment Sale', type: 'asset', color: '#22c55e', icon: '🚜', parentId: assetSaleParent?.id },
      { name: 'Livestock Sale', type: 'asset', color: '#16a34a', icon: '🐄', parentId: assetSaleParent?.id },
      { name: 'Farm Vehicle Sale', type: 'asset', color: '#15803d', icon: '🚚', parentId: assetSaleParent?.id },
      
      // Equity Subcategories (Legacy)
      { name: 'Zerodha - Stock Purchase', type: 'investment', color: '#dc2626', icon: '🔴', parentId: equityParent?.id },
      { name: 'Zerodha - Intraday', type: 'investment', color: '#f87171', icon: '⚡', parentId: equityParent?.id },
      { name: 'Zerodha - F&O', type: 'investment', color: '#b91c1c', icon: '�', parentId: equityParent?.id },
      { name: 'Other Broker - Equity', type: 'investment', color: '#ef4444', icon: '📈', parentId: equityParent?.id },
      
      // Mutual Fund Subcategories
      { name: 'Groww - SIP', type: 'investment', color: '#7c3aed', icon: '🔄', parentId: mfParent?.id },
      { name: 'Groww - Lumpsum', type: 'investment', color: '#a855f7', icon: '💰', parentId: mfParent?.id },
      { name: 'Zerodha - MF', type: 'investment', color: '#8b5cf6', icon: '📊', parentId: mfParent?.id },
      { name: 'ELSS Investments', type: 'investment', color: '#6d28d9', icon: '�', parentId: mfParent?.id },
      { name: 'Other AMC - Direct', type: 'investment', color: '#7c2d12', icon: '🏢', parentId: mfParent?.id },
      
      // Fixed Deposit Subcategories
      { name: 'Bank FD', type: 'investment', color: '#059669', icon: '🏦', parentId: fdParent?.id },
      { name: 'Corporate FD', type: 'investment', color: '#047857', icon: '🏢', parentId: fdParent?.id },
      { name: 'Tax Saver FD', type: 'investment', color: '#065f46', icon: '📋', parentId: fdParent?.id },
      
      // Other Investment Subcategories
      { name: 'PPF', type: 'investment', color: '#4338ca', icon: '🛡️', parentId: otherInvestParent?.id },
      { name: 'EPF', type: 'investment', color: '#3730a3', icon: '👔', parentId: otherInvestParent?.id },
      { name: 'NPS', type: 'investment', color: '#312e81', icon: '🎯', parentId: otherInvestParent?.id },
      { name: 'Gold/Silver', type: 'investment', color: '#d97706', icon: '🥇', parentId: otherInvestParent?.id },
      { name: 'Crypto', type: 'investment', color: '#f59e0b', icon: '₿', parentId: otherInvestParent?.id },
      { name: 'Real Estate', type: 'investment', color: '#92400e', icon: '🏠', parentId: otherInvestParent?.id },
      
      // Banking & Credit Card Fees Subcategories
      { name: 'Account Maintenance Fee', type: 'expense', color: '#7c3aed', icon: '🏦', parentId: bankingFeesParent?.id },
      { name: 'ATM Charges', type: 'expense', color: '#8b5cf6', icon: '🏧', parentId: bankingFeesParent?.id },
      { name: 'Credit Card Annual Fee', type: 'expense', color: '#a855f7', icon: '💳', parentId: bankingFeesParent?.id },
      { name: 'Credit Card Late Payment Fee', type: 'expense', color: '#c084fc', icon: '⏰', parentId: bankingFeesParent?.id },
      { name: 'Cheque Book Charges', type: 'expense', color: '#ddd6fe', icon: '📝', parentId: bankingFeesParent?.id },
      { name: 'Online Transaction Charges', type: 'expense', color: '#7c3aed', icon: '💻', parentId: bankingFeesParent?.id },
      { name: 'SMS/Email Charges', type: 'expense', color: '#8b5cf6', icon: '📱', parentId: bankingFeesParent?.id },
      { name: 'Demat Account Charges', type: 'expense', color: '#a855f7', icon: '📊', parentId: bankingFeesParent?.id },
      { name: 'Loan Processing Fee', type: 'expense', color: '#c084fc', icon: '📋', parentId: bankingFeesParent?.id },
      { name: 'Foreign Transaction Fee', type: 'expense', color: '#ddd6fe', icon: '🌍', parentId: bankingFeesParent?.id },
      { name: 'Overdraft Charges', type: 'expense', color: '#7c3aed', icon: '⚠️', parentId: bankingFeesParent?.id },
      { name: 'NEFT/RTGS Charges', type: 'expense', color: '#8b5cf6', icon: '💸', parentId: bankingFeesParent?.id },
      
      // Miscellaneous Expenses Subcategories
      { name: 'Gifts & Donations', type: 'expense', color: '#6b7280', icon: '🎁', parentId: miscExpenseParent?.id },
      { name: 'Pet Expenses', type: 'expense', color: '#9ca3af', icon: '🐕', parentId: miscExpenseParent?.id },
      { name: 'Subscription Services', type: 'expense', color: '#6b7280', icon: '📺', parentId: miscExpenseParent?.id },
      { name: 'Repair & Maintenance', type: 'expense', color: '#9ca3af', icon: '🔧', parentId: miscExpenseParent?.id },
      { name: 'Legal & Professional', type: 'expense', color: '#6b7280', icon: '⚖️', parentId: miscExpenseParent?.id },
      { name: 'Books & Magazines', type: 'expense', color: '#9ca3af', icon: '📚', parentId: miscExpenseParent?.id },
      { name: 'Other Expenses', type: 'expense', color: '#6b7280', icon: '📋', parentId: miscExpenseParent?.id },
      
      // Miscellaneous Income Subcategories
      { name: 'Cashback & Rewards', type: 'income', color: '#8b5cf6', icon: '🎯', parentId: miscIncomeParent?.id },
      { name: 'Refunds', type: 'income', color: '#a855f7', icon: '↩️', parentId: miscIncomeParent?.id },
      { name: 'Gift Money', type: 'income', color: '#c084fc', icon: '🎁', parentId: miscIncomeParent?.id },
      { name: 'Competition Prize', type: 'income', color: '#ddd6fe', icon: '🏆', parentId: miscIncomeParent?.id },
      { name: 'Found Money', type: 'income', color: '#8b5cf6', icon: '💰', parentId: miscIncomeParent?.id },
      { name: 'Expense Reimbursement', type: 'income', color: '#a855f7', icon: '📄', parentId: miscIncomeParent?.id },
      { name: 'Other Income Sources', type: 'income', color: '#c084fc', icon: '💵', parentId: miscIncomeParent?.id },
    ];

    await prisma.category.createMany({
      data: subcategories.map(sub => ({
        ...sub,
        userId: user.id,
        isDefault: true,
      })),
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
