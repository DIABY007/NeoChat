import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import testRoutes from './routes/testRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import instanceRoutes from './routes/instanceRoutes';
import webhookRoutes from './routes/webhookRoutes';
import difyRoutes from './routes/difyRoutes';
import contactRoutes from './routes/contactRoutes';
import campaignRoutes from './routes/campaignRoutes';
import paymentRoutes from './routes/paymentRoutes';
import testPaymentRoutes from './routes/testPaymentRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import billingRoutes from './routes/billingRoutes';
import botConfigRoutes from './routes/botConfigRoutes';
import uploadRoutes from './routes/uploadRoutes';
import adminRoutes from './routes/adminRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminAgentRoutes from './routes/adminAgentRoutes';
import adminGeminiRoutes from './routes/adminGeminiRoutes';
import bgeRoutes from './routes/bgeRoutes';
import cronRoutes from './routes/cronRoutes';
import statusRoutes from './routes/statusRoutes';
import groupRoutes from './routes/groupRoutes';
import testSystemMessagesRoutes from './routes/testSystemMessagesRoutes';
import './workers/campaignWorker';
import './workers/subscriptionWorker';
import './workers/statusWorker';
import { restoreActiveInstances, startInstanceSync } from './services/instanceRestoreService';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://neochat.pro',
  'https://www.neochat.pro',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'NeoChat Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Routes de production
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/dify', difyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/bot-config', botConfigRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminAgentRoutes);
app.use('/api/admin', adminGeminiRoutes);
app.use('/api/admin/bge', bgeRoutes);
app.use('/api/bge', bgeRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/groups', groupRoutes);

// Routes de test : accessibles uniquement en développement
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', testRoutes);
  app.use('/api/test-payment', testPaymentRoutes);
  app.use('/api/test-system-messages', testSystemMessagesRoutes);
  console.log('⚠️  Routes de test activées (mode développement)');
}

app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  
  // Restaurer les instances WhatsApp actives
  await restoreActiveInstances();
  
  // Démarrer la synchronisation périodique
  startInstanceSync();
});
