import { Queue } from 'bullmq';
import redisConnection from '../config/redis';

export interface StatusJob {
  scheduledStatusId: string;
}

export const statusQueue = new Queue<StatusJob>('StatusQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 200,
      age: 7200,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

console.log('✅ StatusQueue initialized');

export default statusQueue;
