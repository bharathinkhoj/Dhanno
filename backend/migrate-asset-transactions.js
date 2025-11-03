const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Asset handler logic (copied from TypeScript version for migration)
async function handleAssetTransaction(transaction, userId) {
  try {
    const categoryName = transaction.category?.name;
    if (!categoryName) return;

    // Map transaction categories to asset categories and determine if it's purchase or sale
    const assetCategoryMapping = {
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
    throw error; // Re-throw for migration to catch
  }
}

async function migrateExistingAssetTransactions() {
  try {
    console.log('🚀 Starting migration of existing asset transactions...\n');

    // Find all existing asset transactions
    const assetTransactions = await prisma.transaction.findMany({
      where: {
        type: 'asset'
      },
      include: {
        category: true,
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`📊 Found ${assetTransactions.length} existing asset transactions to process\n`);

    if (assetTransactions.length === 0) {
      console.log('✅ No asset transactions found. Migration complete!');
      return;
    }

    const results = {
      processed: 0,
      assetsCreated: 0,
      assetsUpdated: 0,
      skipped: 0,
      errors: 0
    };

    // Group transactions by user for better processing
    const transactionsByUser = assetTransactions.reduce((acc, transaction) => {
      const userId = transaction.userId;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(transaction);
      return acc;
    }, {});

    console.log(`👥 Processing transactions for ${Object.keys(transactionsByUser).length} users\n`);

    // Process each user's transactions
    for (const [userId, transactions] of Object.entries(transactionsByUser)) {
      const user = transactions[0].user;
      console.log(`\n🔄 Processing ${transactions.length} transactions for user: ${user.email}`);

      for (const transaction of transactions) {
        try {
          console.log(`  📝 Processing: ${transaction.description} (${transaction.category?.name}) - ₹${Math.abs(transaction.amount)}`);

          // Get count of assets before processing
          const assetsBefore = await prisma.asset.count({ where: { userId } });

          // Use our existing asset handler
          await handleAssetTransaction(transaction, userId);

          // Check if new asset was created
          const assetsAfter = await prisma.asset.count({ where: { userId } });
          
          if (assetsAfter > assetsBefore) {
            results.assetsCreated++;
            console.log(`    ✅ New asset created`);
          } else {
            results.assetsUpdated++;
            console.log(`    ✅ Existing asset updated`);
          }

          results.processed++;

        } catch (error) {
          console.error(`    ❌ Error processing transaction ${transaction.id}:`, error.message);
          results.errors++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Transactions Processed: ${results.processed}`);
    console.log(`🆕 New Assets Created: ${results.assetsCreated}`);
    console.log(`🔄 Assets Updated: ${results.assetsUpdated}`);
    console.log(`⏭️  Transactions Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log('='.repeat(60));

    // Show final asset summary
    const totalAssets = await prisma.asset.count();
    const activeAssets = await prisma.asset.count({ where: { isActive: true } });
    
    console.log(`\n📈 ASSET SUMMARY AFTER MIGRATION:`);
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Active Assets: ${activeAssets}`);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  console.log('🔄 Asset Transaction Migration Tool');
  console.log('This will process existing asset transactions and create corresponding asset records.\n');
  
  migrateExistingAssetTransactions()
    .then(() => {
      console.log('\n✅ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateExistingAssetTransactions };