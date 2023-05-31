import { Schedule, ISchedule } from "chafouin-shared";
import EventSource from "eventsource";
import redis from "../redis.js";
import winston from "winston";
import fetch from "node-fetch";
import Trips from "./trips.js";
import { Alert, User } from "./user.js";

const scraperBaseUrl = process.env.SCRAPER_BASE_URL;
if (!scraperBaseUrl) {
  throw Error('Environment process.env.SCRAPER_BASE_URL must be set');
}

export function subscribe(userId: string, schedule: Schedule, channelId?: string) {
  const {outboundStation, inboundStation, departureDate} = schedule; 
  const path = schedule.toPath();
  const source = new EventSource(
    encodeURI(`${scraperBaseUrl}/subscribe` + 
    `?outbound=${outboundStation}` + 
    `&inbound=${inboundStation}` +
    `&date=${departureDate}` + 
    '&seats=true' +
    (channelId !== undefined ? `&channel=${channelId}` : '')
  ));
  source.addEventListener('close', async () => {
    source.close();
  });
  source.addEventListener('channel', async (event) => {      
    const channelId = event.data
    let user = await redis.json.get(
      `user:${userId}`
    ) as unknown as User;
    if (!user) {
      await redis.json.set(`user:${userId}`, '.alerts', [{
        path,
        channelId,
        schedule: {outboundStation, inboundStation, departureDate}
      }]);
    }
    user = await redis.json.get(
      `user:${userId}`
    ) as unknown as User;
    winston.info(`User ${userId} subscribed to ${schedule.toPath()} on channel no. ${channelId}`);
    const alerts = user.alerts.filter(alert => alert.path !== path);
    await redis.json.set(`user:${userId}`, '.alerts', [...alerts.map(alert => ({
      channelId: alert.channelId,
      path: alert.path,
      schedule: {...alert.schedule}
    })), {
      channelId, path, schedule: {...schedule}
    }]);
  });
  return {
    onUpdate(tripUpdateFn: (trips: Trips) => void) {
      source.addEventListener('update', (event) => {
        winston.info(`User ${userId} received trip update for ${schedule.toPath()}`);
        tripUpdateFn(Trips.from(JSON.parse(event.data)));
      });
    }
  };
}

export async function unsubscribe (userId: number, path: string) {
  const alerts = await redis.json.get(`user:${userId}`, {path: '.alerts'}) as unknown[] as Alert[];
  await redis.json.set(`user:${userId}`, '.alerts',
    alerts.filter((alert) => alert.path !== path).map((alert) => ({
      channelId: alert.channelId,
      path: alert.path,
      schedule: {...alert.schedule}
    }))
  );
  const alert = alerts.find(alert => alert.path === path);
  if (!alert) {
    throw Error(`User ${userId} has no alert for ${path}`)
  }
  winston.info(`User ${userId} unsubscribed from ${path} on channel no. ${alert.channelId}`);
  fetch(encodeURI(`${scraperBaseUrl}/unsubscribe` + 
  `?channel=${alert.channelId}` +
  `&path=${path}`
  ));
}

export async function restore(restoreFunc: (userId: string, trips: Trips) => void) {
  for await (const key of redis.scanIterator({
    MATCH: 'user:*',
  })) {
    const userId = key.split(':')[1];
    let user: User;
    try {
      user = await redis.json.get(key) as unknown as User;
    } catch (error) {
      winston.info(`No alerts to restore for user ${userId}`);
      return;
    }
    user.alerts.forEach(async (alert) => {
      const schedule = Schedule.from(alert.schedule);
      winston.info(`Restored alert for user ${userId} for ` + 
      `${schedule.toPath()} on channel ${alert.channelId}`);
      return subscribe(
        userId,
        schedule,
        alert.channelId
      ).onUpdate((trips: Trips) => restoreFunc(userId, trips));
    });
  }
}