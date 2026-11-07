import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import prisma from '../config/prisma';

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Payment Webhook Notifications', () => {
  let testUser: any;
  let testSubscription: any;
  let testCartId: string;

  beforeAll(async () => {
    testCartId = `test_cart_${Date.now()}`;
    
    testUser = await prisma.user.create({
      data: {
        phone: '+225TEST123456',
        firstName: 'Test',
        lastName: 'User',
        referralCode: `TEST${Date.now()}`,
        subscription: {
          create: {
            status: 'FREE',
            messageCount: 0,
            maketouCartId: testCartId,
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    testSubscription = testUser.subscription;
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.subscription.delete({
        where: { id: testSubscription.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('Paiement Validé', () => {
    it('devrait envoyer une notification de succès pour status=paid', async () => {
      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: testCartId,
          status: 'paid',
          amount: 5000,
          metadata: {
            plan: 'ASSISTANT',
            userId: testUser.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('validé');

      const updatedSubscription = await prisma.subscription.findUnique({
        where: { id: testSubscription.id },
      });

      expect(updatedSubscription?.status).toBe('ASSISTANT');
      expect(updatedSubscription?.messageCount).toBe(0);
      expect(updatedSubscription?.nextBillingAt).toBeDefined();
    });

    it('devrait envoyer une notification de succès pour status=completed', async () => {
      const newCartId = `test_cart_completed_${Date.now()}`;
      
      await prisma.subscription.update({
        where: { id: testSubscription.id },
        data: {
          maketouCartId: newCartId,
          status: 'FREE',
        },
      });

      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: newCartId,
          status: 'completed',
          amount: 10000,
          metadata: {
            plan: 'DIFFUSION',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('devrait envoyer une notification de succès pour status=success', async () => {
      const newCartId = `test_cart_success_${Date.now()}`;
      
      await prisma.subscription.update({
        where: { id: testSubscription.id },
        data: {
          maketouCartId: newCartId,
          status: 'FREE',
        },
      });

      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: newCartId,
          status: 'success',
          amount: 15000,
          metadata: {
            plan: 'PREMIUM',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Paiement Échoué', () => {
    it('devrait envoyer une notification d\'échec pour status=failed', async () => {
      const newCartId = `test_cart_failed_${Date.now()}`;
      
      await prisma.subscription.update({
        where: { id: testSubscription.id },
        data: {
          maketouCartId: newCartId,
          status: 'FREE',
        },
      });

      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: newCartId,
          status: 'failed',
          amount: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('échoué');

      const subscription = await prisma.subscription.findUnique({
        where: { id: testSubscription.id },
      });

      expect(subscription?.status).toBe('FREE');
    });

    it('devrait envoyer une notification d\'échec pour status=cancelled', async () => {
      const newCartId = `test_cart_cancelled_${Date.now()}`;
      
      await prisma.subscription.update({
        where: { id: testSubscription.id },
        data: {
          maketouCartId: newCartId,
          status: 'FREE',
        },
      });

      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: newCartId,
          status: 'cancelled',
          amount: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('annulé');
    });
  });

  describe('Gestion des Erreurs', () => {
    it('devrait retourner 400 si cart_id est manquant', async () => {
      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          status: 'paid',
          amount: 5000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('devrait retourner 404 si l\'abonnement n\'existe pas', async () => {
      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: 'nonexistent_cart_id',
          status: 'paid',
          amount: 5000,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Commission de Parrainage', () => {
    it('devrait ajouter une commission au parrain lors d\'un paiement réussi', async () => {
      const referrer = await prisma.user.create({
        data: {
          phone: '+225REFERRER123',
          firstName: 'Referrer',
          lastName: 'Test',
          referralCode: `REF${Date.now()}`,
          walletBalance: 0,
          subscription: {
            create: {
              status: 'FREE',
              messageCount: 0,
            },
          },
        },
      });

      const referredCartId = `test_cart_referred_${Date.now()}`;
      
      const referredUser = await prisma.user.create({
        data: {
          phone: '+225REFERRED123',
          firstName: 'Referred',
          lastName: 'Test',
          referralCode: `REFED${Date.now()}`,
          referredBy: referrer.referralCode,
          subscription: {
            create: {
              status: 'FREE',
              messageCount: 0,
              maketouCartId: referredCartId,
            },
          },
        },
        include: {
          subscription: true,
        },
      });

      const response = await request(API_URL)
        .post('/api/payments/webhook')
        .send({
          cart_id: referredCartId,
          status: 'paid',
          amount: 5000,
          metadata: {
            plan: 'ASSISTANT',
          },
        });

      expect(response.status).toBe(200);

      const updatedReferrer = await prisma.user.findUnique({
        where: { id: referrer.id },
      });

      expect(updatedReferrer?.walletBalance).toBe(2000);

      await prisma.subscription.delete({
        where: { id: referredUser.subscription.id },
      });
      await prisma.user.delete({
        where: { id: referredUser.id },
      });
      await prisma.subscription.delete({
        where: { userId: referrer.id },
      });
      await prisma.user.delete({
        where: { id: referrer.id },
      });
    });
  });
});
