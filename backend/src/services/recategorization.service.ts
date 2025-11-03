import { PrismaClient } from '@prisma/client';
import { ollamaService } from '../services/ollama.service';

const prisma = new PrismaClient();

export class RecategorizationService {
  
  async recategorizeAllTransactions(userId: string): Promise<{ updated: number; total: number }> {
    try {
      
      // Get all transactions for the user
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: { category: true }
      });

      // Get all available categories for the user
      const categories = await prisma.category.findMany({
        where: { 
          OR: [
            { userId },
            { isDefault: true }
          ]
        }
      });

      const categoryNames = categories.map(cat => cat.name);
      let updatedCount = 0;

      // Process transactions in batches to avoid overwhelming the AI service
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        
        try {
          
          // Get AI categorization with learning
          const suggestion = await ollamaService.categorizeTransaction(
            transaction.description,
            transaction.merchant,
            Math.abs(transaction.amount), // Use absolute value
            categoryNames,
            userId // Enable learning
          );

          // Find the category ID
          const newCategory = categories.find(cat => cat.name === suggestion.category);
          
          if (newCategory && newCategory.id !== transaction.categoryId && suggestion.confidence > 0.7) {
            // Update the transaction with new category
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                categoryId: newCategory.id,
                llmCategorized: true,
                llmConfidence: suggestion.confidence
              }
            });
            
            updatedCount++;
            // Transaction updated successfully
          }
          
          // Small delay to avoid overwhelming the AI service
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing transaction ${transaction.id}:`, error);
        }
      }

      return {
        updated: updatedCount,
        total: transactions.length
      };
      
    } catch (error) {
      console.error('Error in recategorization:', error);
      throw error;
    }
  }

  async recategorizeTransaction(transactionId: string): Promise<boolean> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { user: true }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get available categories
      const categories = await prisma.category.findMany({
        where: { 
          OR: [
            { userId: transaction.userId },
            { isDefault: true }
          ]
        }
      });

      const categoryNames = categories.map(cat => cat.name);

      // Get AI suggestion with learning
      const suggestion = await ollamaService.categorizeTransaction(
        transaction.description,
        transaction.merchant,
        Math.abs(transaction.amount),
        categoryNames,
        transaction.userId // Enable learning
      );

      // Find the category
      const newCategory = categories.find(cat => cat.name === suggestion.category);
      
      if (newCategory && suggestion.confidence > 0.7) {
        // Update the transaction
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            categoryId: newCategory.id,
            llmCategorized: true,
            llmConfidence: suggestion.confidence
          }
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error recategorizing transaction:', error);
      throw error;
    }
  }
}

export const recategorizationService = new RecategorizationService();