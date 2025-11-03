# Finance Manager 💰🇮🇳

A modern personal finance management web application designed for Indian users, powered by AI for intelligent transaction categorization. Supports major Indian banks and uses INR currency formatting.

## ✨ Features

- **🏦 Indian Bank Support**: HDFC, SBI, ICICI, Axis Bank, Kotak, PNB CSV imports
- **🤖 AI-Powered Categorization**: Automatically categorize transactions using local LLM (Ollama) with Indian context
- **💹 INR Currency**: Native support for Indian Rupees with lakh/crore formatting
- **📊 Visual Analytics**: Interactive charts and graphs for spending trends
- **📝 Transaction Annotations**: Add notes, tags, and attachments to transactions
- **📈 Financial Insights**: Track income, expenses, savings rate, and monthly trends
- **🎨 Modern UI**: Beautiful dark-themed interface with Tailwind CSS
- **🔒 Secure**: JWT authentication with encrypted passwords
- **🚀 Fast**: Built with React, TypeScript, and optimized APIs

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - REST API server
- **TypeScript** - Type-safe backend code
- **PostgreSQL** - Reliable relational database
- **Prisma ORM** - Modern database toolkit
- **Ollama** - Local LLM for AI categorization

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe frontend code
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Beautiful data visualizations
- **React Query** - Powerful data fetching
- **Zustand** - Lightweight state management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Ollama** - [Install from ollama.ai](https://ollama.ai)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd /Users/udai/Documents/finance-manager
```

### 2. Install Ollama and Download a Model

```bash
# Install Ollama from https://ollama.ai

# Pull a small, efficient model for categorization
ollama pull llama3.2:3b

# Verify Ollama is running
ollama list
```

### 3. Set Up the Database

```bash
# Create a PostgreSQL database
createdb finance_manager

# Or using psql
psql -U postgres
CREATE DATABASE finance_manager;
\q
```

### 4. Configure Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your settings:
# DATABASE_URL="postgresql://username:password@localhost:5432/finance_manager?schema=public"
# JWT_SECRET="your-secret-key-change-in-production"
# OLLAMA_BASE_URL="http://localhost:11434"
# OLLAMA_MODEL="llama3.2:3b"

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate
```

### 5. Configure Frontend

```bash
cd ../frontend

# Install dependencies
npm install
```

### 6. Run the Application

#### Option 1: Run Both Together (Recommended)

```bash
# From the root directory
npm install
npm run dev
```

#### Option 2: Run Separately

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Prisma Studio** (Database GUI): `cd backend && npm run prisma:studio`

## 📖 Usage Guide

### First Time Setup

1. **Register an Account**: Navigate to http://localhost:3000 and create an account
2. **Add Your First Transaction**: Click "Add Transaction" button
3. **Let AI Categorize**: Leave the category field empty to let the LLM categorize it automatically
4. **View Analytics**: Check the dashboard for spending insights and trends

### AI Categorization

The app uses Ollama (running locally) to intelligently categorize transactions:

- **Automatic**: Leave category empty when adding transactions
- **Bulk Categorize**: Select multiple uncategorized transactions and use bulk categorize
- **Confidence Score**: AI shows confidence level (🤖 icon on transactions)
- **Learning**: Correct AI suggestions to improve future categorization

### Features

#### Transaction Management
- Add income and expenses
- Attach notes and tags
- Mark recurring transactions
- Upload receipt images (coming soon)

#### Analytics
- **Spending by Category**: Pie chart showing expense distribution
- **Monthly Trends**: Line chart tracking income vs expenses
- **Summary Stats**: Quick view of income, expenses, savings rate
- **Date Filtering**: View specific time periods

#### Categories
- Default categories provided on signup
- Create custom categories with colors and icons
- Separate categories for income and expenses

## 🔧 Configuration

### Backend Environment Variables

```env
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/finance_manager?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:3b"  # or "phi3", "mistral:7b"
NODE_ENV="development"
```

### Ollama Models

You can use different models for categorization:

- **llama3.2:3b** (Recommended) - Fast and efficient
- **phi-3** - Microsoft's compact model
- **mistral:7b** - More powerful, slower

Change model in `.env`:
```bash
ollama pull mistral:7b
# Update OLLAMA_MODEL in .env
```

## 🎨 Customization

### Adding Custom Categories

1. Navigate to Categories page (coming soon)
2. Click "Add Category"
3. Choose name, color, icon, and type

### Modifying AI Prompts

Edit `backend/src/services/ollama.service.ts` to customize how the AI categorizes transactions.

## 📊 Database Schema

Key models:
- **User**: Authentication and user data
- **Transaction**: Financial transactions with AI metadata
- **Category**: Transaction categories
- **Annotations**: Notes, tags, attachments

View full schema: `backend/prisma/schema.prisma`

## 🐛 Troubleshooting

### Ollama Not Found

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama service
ollama serve
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
pg_isready

# Check DATABASE_URL in .env
# Ensure database exists
psql -U postgres -c "CREATE DATABASE finance_manager;"
```

### Port Already in Use

```bash
# Change ports in:
# - backend/.env (PORT)
# - frontend/vite.config.ts (server.port)
```

## 🚀 Deployment

### Backend Deployment (Railway, Render, etc.)

1. Set environment variables
2. Connect PostgreSQL database
3. Run migrations: `npm run prisma:migrate`
4. Start: `npm start`

### Frontend Deployment (Vercel, Netlify)

1. Build: `npm run build`
2. Deploy `dist` folder
3. Set `VITE_API_URL` to backend URL

### Self-Hosted Ollama

For production, host Ollama on a separate server:
```bash
# Set OLLAMA_BASE_URL to your Ollama server
OLLAMA_BASE_URL="http://your-ollama-server:11434"
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) - Local LLM runtime
- [Recharts](https://recharts.org) - React charting library
- [Prisma](https://prisma.io) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Made with ❤️ using 100% open-source technologies**
