import { Router, Request, Response } from 'express';
import { messageQueue } from '../queues/messageQueue';

const router = Router();

router.post('/test-job', async (req: Request, res: Response) => {
  try {
    const { instanceName, recipientPhone, message } = req.body;

    const job = await messageQueue.add('test-message', {
      instanceName: instanceName || 'test-instance',
      recipientPhone: recipientPhone || '+221000000000',
      message: message || 'Hello World from BullMQ!',
      userId: 'test-user-id',
    });

    console.log(`[Test] Job added to queue with ID: ${job.id}`);

    res.status(200).json({
      success: true,
      message: 'Job added to MessageQueue',
      jobId: job.id,
      data: job.data,
    });
  } catch (error: any) {
    console.error('[Test] Error adding job:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/test-multiple-jobs', async (req: Request, res: Response) => {
  try {
    const { instanceName, count } = req.body;
    const instance = instanceName || 'test-instance';
    const jobCount = count || 3;

    const jobs = [];
    for (let i = 1; i <= jobCount; i++) {
      const job = await messageQueue.add(`test-message-${i}`, {
        instanceName: instance,
        recipientPhone: `+22100000000${i}`,
        message: `Test message ${i} from BullMQ`,
        userId: 'test-user-id',
      });
      jobs.push({ id: job.id, message: job.data.message });
    }

    console.log(`[Test] ${jobCount} jobs added to queue for instance: ${instance}`);

    res.status(200).json({
      success: true,
      message: `${jobCount} jobs added to MessageQueue`,
      jobs,
    });
  } catch (error: any) {
    console.error('[Test] Error adding multiple jobs:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
