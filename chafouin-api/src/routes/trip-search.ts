import { Router } from "express";
import parseSchedule from "../middlewares/parse-schedule.js";
import uzrailways from "../uzrailways.js";

const router = Router();
router.get('/search', parseSchedule, async (_, res) => {
  return res.send(await uzrailways.fetchTrips(res.locals.tripSchedule));
});
export default router;