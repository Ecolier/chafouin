import { Trips, Schedule } from "chafouin-shared";
import EventSource from "eventsource";
import redis from "./redis.js";
import winston from "winston";
import { formatTripSchedule } from "./format-trip-schedule.js";
import fetch from "node-fetch";

export interface Alert {
  channelId: string;
  schedule: Schedule;
}

export interface User {
  alerts: Alert[];
  chatId: number;
}

const scraperBaseUrl = process.env.SCRAPER_BASE_URL;
if (!scraperBaseUrl) {
  throw Error('Environment process.env.SCRAPER_BASE_URL must be set');
}

export function subscribe(userId: number, chatId: number,
  schedule: Schedule, channelId?: string) {
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
  source.addEventListener('close', async (event) => {
    console.log('close');
    source.close();
  });
  source.addEventListener('channel', async (event) => {      
    const channelId = event.data
    let savedUser = await redis.json.get(
      `user:${userId}`
    ) as any;
    if (!savedUser) {
      await redis.json.set(`user:${userId}`, '$', {chatId});
      await redis.json.set(`user:${userId}`, '.alerts', [{
        path,
        channelId,
        schedule: {outboundStation, inboundStation, departureDate}
      }]);
    }
    savedUser = await redis.json.get(
      `user:${userId}`
    ) as any;
    winston.info(`User ${userId} in chat ${chatId} subscribed to ${formatTripSchedule(schedule)} on channel no. ${channelId}`);
    const savedAlerts = (savedUser.alerts as any[]).filter(alert => alert.path !== path);
    await redis.json.set(`user:${userId}`, '.alerts', [...savedAlerts, {
      channelId, schedule, path
    }]);
  });
  return {
    onUpdate(tripUpdateFn: (trips: Trips) => void) {
      source.addEventListener('update', (event) => {
        winston.info(`User ${userId} in chat ${chatId} received trip update for ${formatTripSchedule(schedule)}`);
        tripUpdateFn(JSON.parse(event.data));
      });
    }
  };
}

export async function unsubscribe (userId: number, path: string) {
  const alerts = await redis.json.get(`user:${userId}`, {path: '.alerts'}) as any[];
  await redis.json.set(`user:${userId}`, '.alerts',
    (alerts as any[]).filter((alert) => alert.path !== path)
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