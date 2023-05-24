import { Trip, TripSchedule, TripUpdate, tripScheduleEquals } from "chafouin-shared";
import EventSource from "eventsource";
import { RedisClient } from "./redis";
import winston from "winston";
import { formatTripSchedule } from "./format-trip-schedule.js";
import fetch from "node-fetch";

export interface Alert {
  channelId: number;
  schedule: TripSchedule;
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
  schedule: TripSchedule, redisClient: RedisClient, channelId?: number) {
  const {outboundStation, inboundStation, departureDate} = schedule; 
  
  const source = new EventSource(
    encodeURI(`${scraperBaseUrl}/subscribe` + 
    `?outbound=${outboundStation}` + 
    `&inbound=${inboundStation}` +
    `&date=${departureDate}` + 
    '&seats=true' +
    (channelId !== undefined ? `&channel=${channelId}` : '')
  ));
  source.addEventListener('channel', async (event) => {      
    const channelId = parseInt(event.data)
    let savedUser = await redisClient.json.get(
      `user:${userId}`
    ) as any;
    if (!savedUser) {
      await redisClient.json.set(`user:${userId}`, '$', {chatId});
      await redisClient.json.set(`user:${userId}`, '.alerts', [{
        channelId,
        schedule: {outboundStation, inboundStation, departureDate}
      }]);
    }
    savedUser = await redisClient.json.get(
      `user:${userId}`
    ) as any;
    winston.info(`User ${userId} in chat ${chatId} subscribed to ${formatTripSchedule(schedule)} on channel no. ${channelId}`);
    const savedAlerts = (savedUser.alerts as any[]).filter(alert => !tripScheduleEquals(alert.schedule, schedule));
    await redisClient.json.set(`user:${userId}`, '.alerts', [...savedAlerts, {
      channelId, schedule
    }]);
  });
  return {
    onUpdate(tripUpdateFn: (trips: (Trip | TripUpdate)[]) => void) {
      source.addEventListener('update', (event) => {
        winston.info(`User ${userId} in chat ${chatId} received trip update for ${formatTripSchedule(schedule)}`);
        tripUpdateFn(JSON.parse(event.data));
      });
    }
  };
}

export async function unsubscribe (userId: number, schedule: TripSchedule, redisClient: RedisClient) {

  const alerts = await redisClient.json.get(`user:${userId}`, {path: '.alerts'}) as any[];
  await redisClient.json.set(`user:${userId}`, '.alerts', 
    (alerts as any[]).filter((alert) => !tripScheduleEquals(alert.schedule, schedule))
  );

  const alert = alerts.find(alert => tripScheduleEquals(alert.schedule, schedule));
  if (!alert) {
    throw Error(`User ${userId} has no alert for ${formatTripSchedule(schedule)}`)
  }

  winston.info(`User ${userId} unsubscribed from ${formatTripSchedule(schedule)} on channel no. ${alert.channelId}`);

  fetch(encodeURI(`${scraperBaseUrl}/unsubscribe` + 
  `?channel=${alert.channelId}` +
  `&outbound=${schedule.outboundStation}` + 
  `&inbound=${schedule.inboundStation}` +
  `&date=${schedule.departureDate}`
  ));
}