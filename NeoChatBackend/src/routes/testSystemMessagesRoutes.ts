import { Router, Request, Response } from 'express';
import SystemMessagesService from '../services/systemMessagesService';

const router = Router();

const TEST_PHONE = process.env.TEST_PHONE || '';

router.post('/test-otp', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendOTP(phone, '123456');
    res.json({ success: true, message: 'OTP envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-welcome', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendWelcomeMessage(phone, 'TestUser');
    res.json({ success: true, message: 'Welcome envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-instance-connected', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendInstanceConnected(phone, 'Test_Instance');
    res.json({ success: true, message: 'Instance connected envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-instance-disconnected', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendInstanceDisconnected(phone, 'Test_Instance');
    res.json({ success: true, message: 'Instance disconnected envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-payment-success', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendPaymentSuccess(phone, 'TestUser', 'PREMIUM');
    res.json({ success: true, message: 'Payment success envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-payment-failed', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendPaymentFailed(phone);
    res.json({ success: true, message: 'Payment failed envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-renewal-reminder', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    const daysLeft = req.body.daysLeft ?? 15;
    await SystemMessagesService.sendRenewalReminder(phone, 'TestUser', daysLeft, 'PREMIUM', 10000, '15/05/2026');
    res.json({ success: true, message: `Renewal reminder J-${daysLeft} envoyé`, phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-service-suspended', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendServiceSuspended(phone, 'TestUser');
    res.json({ success: true, message: 'Service suspended envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-quota-warning', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendQuotaWarning(phone, 'messages d\'essai', 80, 10, 50);
    res.json({ success: true, message: 'Quota warning envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-quota-exhausted', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendQuotaExhausted(phone, 'messages d\'essai (50 messages)');
    res.json({ success: true, message: 'Quota exhausted envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-broadcast-complete', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendBroadcastComplete(phone, 'Campagne Test', 95, 100);
    res.json({ success: true, message: 'Broadcast complete envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-knowledge-processed', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    const success = req.body.success !== false;
    await SystemMessagesService.sendKnowledgeProcessed(phone, 'document-test.pdf', success);
    res.json({ success: true, message: `Knowledge processed (success=${success}) envoyé`, phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-bot-status-changed', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    const isActive = req.body.isActive !== false;
    await SystemMessagesService.sendBotStatusChanged(phone, 'Test_Instance', isActive);
    res.json({ success: true, message: `Bot status changed (active=${isActive}) envoyé`, phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-promo-code', async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone || TEST_PHONE;
    await SystemMessagesService.sendPromoCodeConfirmation(phone, 'TestUser', 1000);
    res.json({ success: true, message: 'Promo code confirmation envoyé', phone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test ALL messages in sequence
router.post('/test-all', async (req: Request, res: Response) => {
  const phone = req.body.phone || TEST_PHONE;
  const results: { name: string; success: boolean; error?: string }[] = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const tests = [
    { name: 'OTP', fn: () => SystemMessagesService.sendOTP(phone, '123456') },
    { name: 'Welcome', fn: () => SystemMessagesService.sendWelcomeMessage(phone, 'TestUser') },
    { name: 'Instance Connected', fn: () => SystemMessagesService.sendInstanceConnected(phone, 'Test_Instance') },
    { name: 'Instance Disconnected', fn: () => SystemMessagesService.sendInstanceDisconnected(phone, 'Test_Instance') },
    { name: 'Payment Success', fn: () => SystemMessagesService.sendPaymentSuccess(phone, 'TestUser', 'PREMIUM') },
    { name: 'Payment Failed', fn: () => SystemMessagesService.sendPaymentFailed(phone) },
    { name: 'Renewal Reminder J-15', fn: () => SystemMessagesService.sendRenewalReminder(phone, 'TestUser', 15, 'PREMIUM', 10000, '15/05/2026') },
    { name: 'Renewal Reminder J-7', fn: () => SystemMessagesService.sendRenewalReminder(phone, 'TestUser', 7, 'PREMIUM', 10000, '08/05/2026') },
    { name: 'Renewal Reminder J-3', fn: () => SystemMessagesService.sendRenewalReminder(phone, 'TestUser', 3, 'PREMIUM', 10000, '04/05/2026') },
    { name: 'Renewal Reminder J-0', fn: () => SystemMessagesService.sendRenewalReminder(phone, 'TestUser', 0, 'PREMIUM', 10000, '01/05/2026') },
    { name: 'Service Suspended', fn: () => SystemMessagesService.sendServiceSuspended(phone, 'TestUser') },
    { name: 'Quota Warning', fn: () => SystemMessagesService.sendQuotaWarning(phone, 'messages d\'essai', 80, 10, 50) },
    { name: 'Quota Exhausted', fn: () => SystemMessagesService.sendQuotaExhausted(phone, 'messages d\'essai (50 messages)') },
    { name: 'Broadcast Complete', fn: () => SystemMessagesService.sendBroadcastComplete(phone, 'Campagne Test', 95, 100) },
    { name: 'Knowledge Processed (success)', fn: () => SystemMessagesService.sendKnowledgeProcessed(phone, 'doc.pdf', true) },
    { name: 'Knowledge Processed (error)', fn: () => SystemMessagesService.sendKnowledgeProcessed(phone, 'doc.pdf', false) },
    { name: 'Bot Activated', fn: () => SystemMessagesService.sendBotStatusChanged(phone, 'Test_Instance', true) },
    { name: 'Bot Paused', fn: () => SystemMessagesService.sendBotStatusChanged(phone, 'Test_Instance', false) },
    { name: 'Promo Code Confirmation', fn: () => SystemMessagesService.sendPromoCodeConfirmation(phone, 'TestUser', 1000) },
  ];

  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, success: true });
      console.log(`[TestSystemMessages] ✅ ${test.name} envoyé`);
    } catch (error: any) {
      results.push({ name: test.name, success: false, error: error.message });
      console.error(`[TestSystemMessages] ❌ ${test.name} échoué:`, error.message);
    }
    await delay(1000); // 1s entre chaque message pour éviter le rate limiting
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  res.json({
    success: failCount === 0,
    message: `${successCount}/${results.length} messages envoyés avec succès`,
    phone,
    results,
  });
});

export default router;
