import { Router } from 'express';
import tripBroadcast from '../trip-broadcast.js';

const router = Router();
router.get('/unsubscribe', 
async (req, res) => {
  const channelId = (req.query as any).channel;
  const workerId = (req.query as any).path;
  tripBroadcast.unsubscribe(
    workerId,
    channelId,
  );
  return res.sendStatus(200);
});
export default router;