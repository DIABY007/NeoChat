import { Queue } from 'bullmq';
import redisConnection from '../config/redis';

export interface MessageJob {
  instanceName: string;
  recipientPhone: string;
  message: string;
  userId: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

export const messageQueue = new Queue<MessageJob>('MessageQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

console.log('✅ MessageQueue initialized');

export default messageQueue;
