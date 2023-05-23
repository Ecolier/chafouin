import * as dotenv from 'dotenv';
dotenv.config();

import winston from 'winston';

import start from './start.js'

import { Telegraf, session, Scenes, Context } from "telegraf";
import { subscribeScene, subscribeSceneId } from "./subscribe.js";
import { alertScene, alertSceneId } from './alert.js';

import { createRedisClient } from './redis.js';
import { SceneContext, SceneSessionData } from 'telegraf/typings/scenes/context.js';
import { Trip, TripSchedule } from 'chafouin-shared';
import { ScheduleSource, savedSubscriptions } from './subscription.js';
import EventSource from 'eventsource';

const CHAFOUIN_BASE_URL = 'http://scraper:8080';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw Error('TELEGRAM_BOT_TOKEN must be set.');
}

winston.configure({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winston.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const redisClient = createRedisClient();

const stage = new Scenes.Stage([
  subscribeScene(redisClient),
  alertScene(redisClient)
]);

const telegramBot = new Telegraf<SceneContext>(TELEGRAM_BOT_TOKEN);

telegramBot.use(session());
telegramBot.use(stage.middleware());

telegramBot.start(start(redisClient));

telegramBot.action('@subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));
telegramBot.command('subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));

telegramBot.action('@alerts', (ctx) => ctx.scene.enter(alertSceneId));
telegramBot.command('alerts', (ctx) => ctx.scene.enter(alertSceneId));

await redisClient.connect();
winston.info(`Connected to redis instance`);

// Restore event sources from redis for each users
for await (const key of redisClient.scanIterator({
  MATCH: 'user:*',
})) {
  const userId = parseInt(key.split(':')[1]);
  let alerts: TripSchedule[] = [];
  try {
    alerts = await redisClient.json.get(key, {path: '.alerts'}) as unknown as TripSchedule[];
  } catch (error) {
    winston.info(`No subscriptions to restore for user ${userId}`);
  }
  const subscriptions = alerts.reduce<ScheduleSource[]>((prev, curr) => [
    ...prev, [
      curr,
      new EventSource(encodeURI(`${CHAFOUIN_BASE_URL}/subscribe?outbound=${curr.outboundStation}&inbound=${curr.inboundStation}&seats=true&date=${curr.departureDate}`))]
  ], []);
  winston.info(`Restore ${subscriptions.length} subscriptions for user ${userId}`);
  savedSubscriptions.set(userId, subscriptions);
}

await telegramBot.launch();
winston.info(`Launched Telegram bot`);

const cleanSavedSubscriptions = () => {
  Array.from(savedSubscriptions.entries()).forEach(([userId, scheduleSource]) => {
    scheduleSource.forEach(([_, source]) => {
      winston.info(`Closing source for ${userId}`);
      source.close();
    });
  });
}

process.once('SIGINT', () => {
  cleanSavedSubscriptions();
  redisClient.disconnect();
  telegramBot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  cleanSavedSubscriptions();
  redisClient.disconnect();
  telegramBot.stop('SIGTERM');
});