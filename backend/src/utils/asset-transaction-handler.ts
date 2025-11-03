import { prisma } from '../lib/prisma';

// Helper function to handle automatic asset creation/update
export async function handleAssetTransaction(transaction: any, userId: string) {
  try {
    const categoryName = transaction.category?.name;
    if (!categoryName) return;

    // Map transaction categories to asset categories and determine if it's purchase or sale
    const assetCategoryMapping: Record<string, { category: string; subCategory?: string; isSale?: boolean }> = {
      // Asset Purchases
      'Stock Purchase': { category: 'Stocks', subCategory: 'Individual Stocks' },
      'Mutual Fund Purchase': { category: 'Mutual Funds', subCategory: 'Equity Funds' },
      'PPF Contribution': { category: 'Fixed Deposits', subCategory: 'PPF' },
      'EPF Contribution': { category: 'Fixed Deposits', subCategory: 'EPF' },
      'NPS Contribution': { category: 'Fixed Deposits', subCategory: 'NPS' },
      'Gold Purchase': { category: 'Precious Metals', subCategory: 'Gold' },
      'Real Estate Purchase': { category: 'Real Estate', subCategory: 'Residential' },
      'Farm Equipment Purchase': { category: 'Farm Assets', subCategory: 'Equipment' },
      'Livestock Purchase': { category: 'Farm Assets', subCategory: 'Livestock' },
      'Asset Purchase': { category: 'Other Assets', subCategory: 'Miscellaneous' },
      
      // Asset Sales
      'Stock Sale': { category: 'Stocks', subCategory: 'Individual Stocks', isSale: true },
      'Mutual Fund Redemption': { category: 'Mutual Funds', subCategory: 'Equity Funds', isSale: true },
      'Asset Sale': { category: 'Other Assets', subCategory: 'Miscellaneous', isSale: true }
    };

    const assetInfo = assetCategoryMapping[categoryName];
    if (!assetInfo) return; // Skip if not a mappable asset category

    // Extract asset name from transaction description
    const description = transaction.description || '';
    const merchant = transaction.merchant || '';
    const assetName = merchant || description.split(' ').slice(0, 3).join(' ') || 'Unknown Asset';
    
    // Check if asset already exists (for recurring investments like SIP)
    const existingAsset = await prisma.asset.findFirst({
      where: {
        userId: userId,
        name: assetName,
        category: assetInfo.category,
        subCategory: assetInfo.subCategory
      }
    });

    if (existingAsset) {
      if (assetInfo.isSale) {
        // Asset sale - reduce current value
        const newValue = Math.max(0, existingAsset.currentValue - Math.abs(transaction.amount));
        await prisma.asset.update({
          where: { id: existingAsset.id },
          data: {
            currentValue: newValue,
            isActive: newValue > 0, // Mark as inactive if fully sold
            lastUpdated: new Date(),
            updatedAt: new Date()
          }
        });
      } else {
        // Asset purchase - add to current value
        await prisma.asset.update({
          where: { id: existingAsset.id },
          data: {
            currentValue: existingAsset.currentValue + Math.abs(transaction.amount),
            quantity: (existingAsset.quantity || 0) + 1, // Increment purchase count
            lastUpdated: new Date(),
            updatedAt: new Date()
          }
        });
      }
    } else if (!assetInfo.isSale) {
      // Only create new asset for purchases, not sales
      await prisma.asset.create({
        data: {
          userId: userId,
          name: assetName,
          category: assetInfo.category,
          subCategory: assetInfo.subCategory,
          currentValue: Math.abs(transaction.amount),
          purchaseValue: Math.abs(transaction.amount),
          purchaseDate: transaction.date,
          quantity: 1,
          description: `Auto-created from transaction: ${description}`,
          isActive: true,
          lastUpdated: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error handling asset transaction:', error);
    // Don't throw error to avoid breaking transaction creation
  }
}