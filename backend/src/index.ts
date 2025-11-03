import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import categoryRoutes from './routes/category.routes';
import analyticsRoutes from './routes/analytics.routes';
import csvRoutes from './routes/csv.routes';
import recategorizeRoutes from './routes/recategorize.routes';
import learningRoutes from './routes/learning.routes';
import assetRoutes from './routes/asset.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/recategorize', recategorizeRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/assets', assetRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Finance Manager API ready`);
});
