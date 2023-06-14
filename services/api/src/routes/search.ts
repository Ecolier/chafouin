import { Router } from 'express';
import railwaysProvider from '@chafouin/provider';
import parseSchedule from '../middlewares/parse-schedule.js';

const router = Router();
router.get('/search', parseSchedule, async (_, res) => {
  return res.send(await railwaysProvider.fetchTrips(res.locals.tripSchedule));
});
export default router;