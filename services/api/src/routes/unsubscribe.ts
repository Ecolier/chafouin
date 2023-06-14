import { Router } from 'express';
import tripBroadcast from '../trip-broadcast.js';

const router = Router();
router.get('/unsubscribe', 
async (req, res) => {
  const { channelId, workerId } = req.query as { [key: string]: string };
  tripBroadcast.unsubscribe(
    workerId,
    channelId,
  );
  return res.sendStatus(200);
});
export default router;