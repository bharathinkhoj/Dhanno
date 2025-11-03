import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LearningService {
  
  /**
   * Record a user's manual category correction for future learning
   */
  async recordUserCorrection(
    userId: string,
    description: string,
    merchant: string | null,
    categoryId: string,
    confidence: number = 1.0
  ): Promise<void> {
    try {
      // Check if a pattern already exists for this user and description
      const existingPattern = await prisma.categoryPattern.findFirst({
        where: {
          userId,
          description: {
            equals: description,
            mode: 'insensitive'
          },
          merchant: merchant || null
        }
      });

      if (existingPattern) {
        // Update existing pattern with higher confidence (user correction)
        await prisma.categoryPattern.update({
          where: { id: existingPattern.id },
          data: {
            categoryId,
            confidence: Math.max(confidence, existingPattern.confidence),
            isUserCorrection: true,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new pattern
        await prisma.categoryPattern.create({
          data: {
            userId,
            description,
            merchant,
            categoryId,
            confidence,
            isUserCorrection: true
          }
        });
      }

      // Learning pattern recorded successfully
    } catch (error) {
      console.error('Error recording user correction:', error);
    }
  }

  /**
   * Get learned patterns for a user to improve categorization
   */
  async getUserPatterns(userId: string): Promise<Array<{
    description: string;
    merchant: string | null;
    categoryName: string;
    categoryId: string;
    confidence: number;
    isUserCorrection: boolean;
  }>> {
    const patterns = await prisma.categoryPattern.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return patterns.map(pattern => ({
      description: pattern.description,
      merchant: pattern.merchant,
      categoryName: pattern.category.name,
      categoryId: pattern.categoryId,
      confidence: pattern.confidence,
      isUserCorrection: pattern.isUserCorrection
    }));
  }

  /**
   * Find similar transactions based on learned patterns
   */
  async findSimilarPattern(
    userId: string,
    description: string,
    merchant: string | null
  ): Promise<{
    categoryId: string;
    categoryName: string;
    confidence: number;
    matchType: 'exact' | 'description' | 'merchant' | 'keywords';
  } | null> {
    // 1. Try exact match first
    const exactMatch = await prisma.categoryPattern.findFirst({
      where: {
        userId,
        description: {
          equals: description,
          mode: 'insensitive'
        },
        merchant: merchant || null
      },
      include: { category: true },
      orderBy: { confidence: 'desc' }
    });

    if (exactMatch) {
      return {
        categoryId: exactMatch.categoryId,
        categoryName: exactMatch.category.name,
        confidence: exactMatch.confidence,
        matchType: 'exact'
      };
    }

    // 2. Try description similarity
    const descWords = this.extractKeywords(description);
    if (descWords.length > 0) {
      const patterns = await prisma.categoryPattern.findMany({
        where: { userId },
        include: { category: true }
      });

      for (const pattern of patterns) {
        const patternWords = this.extractKeywords(pattern.description);
        const similarity = this.calculateSimilarity(descWords, patternWords);
        
        if (similarity > 0.7) { // 70% similarity threshold
          return {
            categoryId: pattern.categoryId,
            categoryName: pattern.category.name,
            confidence: pattern.confidence * similarity,
            matchType: 'description'
          };
        }
      }
    }

    // 3. Try merchant match
    if (merchant) {
      const merchantMatch = await prisma.categoryPattern.findFirst({
        where: {
          userId,
          merchant: {
            contains: merchant,
            mode: 'insensitive'
          }
        },
        include: { category: true },
        orderBy: { confidence: 'desc' }
      });

      if (merchantMatch) {
        return {
          categoryId: merchantMatch.categoryId,
          categoryName: merchantMatch.category.name,
          confidence: merchantMatch.confidence * 0.8, // Slightly lower confidence for merchant-only match
          matchType: 'merchant'
        };
      }
    }

    return null;
  }

  /**
   * Extract meaningful keywords from transaction descriptions
   */
  private extractKeywords(text: string): string[] {
    const cleanText = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const stopWords = new Set(['upi', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over']);
    
    return cleanText
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to first 10 meaningful words
  }

  /**
   * Calculate similarity between two sets of keywords
   */
  private calculateSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Cleanup old patterns to prevent database bloat
   */
  async cleanupOldPatterns(userId: string, keepDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const result = await prisma.categoryPattern.deleteMany({
      where: {
        userId,
        isUserCorrection: false, // Don't delete user corrections
        updatedAt: {
          lt: cutoffDate
        }
      }
    });

      // Cleaned up old AI patterns
    return result.count;
  }

  /**
   * Get categorization statistics for a user
   */
  async getCategoryStats(userId: string): Promise<{
    totalPatterns: number;
    userCorrections: number;
    aiPatterns: number;
    averageConfidence: number;
  }> {
    const stats = await prisma.categoryPattern.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { confidence: true }
    });

    const userCorrections = await prisma.categoryPattern.count({
      where: { userId, isUserCorrection: true }
    });

    return {
      totalPatterns: stats._count.id || 0,
      userCorrections,
      aiPatterns: (stats._count.id || 0) - userCorrections,
      averageConfidence: stats._avg.confidence || 0
    };
  }
}

export const learningService = new LearningService();