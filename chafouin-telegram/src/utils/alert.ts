import EventSource from "eventsource";
import redis from "../redis.js";
import fetch from "node-fetch";
import Trips from "./trips.js";
import { Alerts, User } from "./user.js";

import logging from './logging.js';
import { Schedule } from "chafouin-shared";
const logger = logging('alert');

const scraperBaseUrl = process.env.SCRAPER_BASE_URL;
if (!scraperBaseUrl) {
  throw Error('Environment process.env.SCRAPER_BASE_URL must be set');
}

export function subscribe(userId: string, schedule: Schedule, channelId?: string) {
  const {outboundStation, inboundStation, departureDate} = schedule; 
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
    const channel = event.data
    const user = await redis.json.get(
      `user:${userId}`
    ) as unknown as User;
    if (!user) {
      await redis.json.set(`user:${userId}`, '$', {
        alerts: {}
      });
    }
    logger.info(`User ${userId} subscribed to ${schedule.toPath()} on channel no. ${channel}`);
    await redis.json.set(`user:${userId}`, `.alerts.${schedule.toPath()}`, {
      channel,
      schedule: {
        outboundStation: schedule.outboundStation,
        inboundStation: schedule.inboundStation,
        departureDate: schedule.departureDate.toISOString()
      }
    });
  });
  return {
    onUpdate(tripUpdateFn: (trips: Trips) => void) {
      source.addEventListener('update', (event) => {
        logger.info(`User ${userId} received trip update for ${schedule.toPath()}`);
        tripUpdateFn(Trips.from(JSON.parse(event.data)));
      });
    }
  };
}

export async function unsubscribe (userId: number, path: string) {
  const alerts = await redis.json.get(`user:${userId}`, {path: '.alerts'}) as unknown as Alerts;
  const {[path]: alert, ...rest} = alerts;
  await redis.json.set(`user:${userId}`, '.alerts', rest);
  logger.info(`User ${userId} unsubscribed from ${path} on channel no. ${alert.channel}`);
  fetch(encodeURI(`${scraperBaseUrl}/unsubscribe` + 
  `?channel=${alert.channel}` +
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
      logger.info(`No alerts to restore for user ${userId}`);
      return;
    }
    Object.values(user.alerts).forEach(async (alert) => {
      const schedule = Schedule.from(alert.schedule);
      logger.info(`Restored alert for user ${userId} for ` + 
      `${schedule.toPath()} on channel ${alert.channel}`);
      return subscribe(
        userId,
        schedule,
        alert.channel
      ).onUpdate((trips: Trips) => restoreFunc(userId, trips));
    });
  }
}