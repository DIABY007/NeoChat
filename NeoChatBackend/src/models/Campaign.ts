import prisma from '../config/prisma';
import { Campaign, CampaignStatus } from '@prisma/client';

export type { Campaign } from '@prisma/client';

export async function createCampaign(data: {
  userId: string;
  instanceName: string;
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  recipients: string[];
  scheduledAt: Date;
  status?: CampaignStatus;
}): Promise<Campaign> {
  return prisma.campaign.create({
    data: {
      userId: data.userId,
      instanceName: data.instanceName,
      name: data.name,
      message: data.message,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      recipients: data.recipients,
      scheduledAt: data.scheduledAt,
      status: data.status || 'PENDING',
      processedCount: 0,
      totalCount: data.recipients.length,
    },
  });
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  return prisma.campaign.findUnique({ where: { id } });
}

export async function updateCampaign(id: string, updates: {
  status?: CampaignStatus;
  processedCount?: number;
  name?: string;
  message?: string;
  scheduledAt?: Date;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): Promise<Campaign | null> {
  try {
    return await prisma.campaign.update({
      where: { id },
      data: updates,
    });
  } catch {
    return null;
  }
}

export async function getUserCampaigns(userId: string): Promise<Campaign[]> {
  return prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPendingCampaigns(): Promise<Campaign[]> {
  return prisma.campaign.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: new Date() },
    },
  });
}

export async function duplicateCampaign(id: string, userId: string): Promise<Campaign | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== userId) return null;

  const recipients = campaign.recipients as string[];

  return prisma.campaign.create({
    data: {
      userId: campaign.userId,
      instanceName: campaign.instanceName,
      name: `${campaign.name} (Copie)`,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl,
      mediaType: campaign.mediaType,
      recipients: recipients,
      scheduledAt: new Date(Date.now() + 3600000),
      status: 'PENDING',
      processedCount: 0,
      totalCount: recipients.length,
    },
  });
}

export async function deleteCampaign(id: string, userId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== userId) return false;
  if (campaign.status === 'PROCESSING') return false;

  await prisma.campaign.delete({ where: { id } });
  return true;
}

export async function pauseCampaign(id: string, userId: string): Promise<Campaign | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== userId) return null;
  if (campaign.status !== 'PENDING') return null;

  return prisma.campaign.update({
    where: { id },
    data: { status: 'PAUSED' },
  });
}

export async function resumeCampaign(id: string, userId: string): Promise<Campaign | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== userId) return null;
  if (campaign.status !== 'PAUSED') return null;

  return prisma.campaign.update({
    where: { id },
    data: { status: 'PENDING' },
  });
}
