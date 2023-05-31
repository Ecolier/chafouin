import * as dotenv from 'dotenv';
dotenv.config();

import winston from 'winston';

import start from './scenes/start.js'

import { Telegraf, session, Scenes } from "telegraf";
import subscribeScene, { formatAlert, subscribeSceneId } from "./scenes/subscribe.js";
import alertScene, { alertSceneId } from './scenes/alerts.js';

import redis from './redis.js';
import { SceneContext } from 'telegraf/typings/scenes/context.js';

import * as alerts from './scenes/alerts.js';
import { formatTripSchedule } from './utils/schedule.js';
import { Schedule } from 'chafouin-shared';

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

const stage = new Scenes.Stage([
  subscribeScene,
  alertScene
]);

const telegramBot = new Telegraf<SceneContext>(TELEGRAM_BOT_TOKEN);

telegramBot.use(session());
telegramBot.use(stage.middleware());

telegramBot.start(start);

telegramBot.action('@subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));
telegramBot.command('subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));

telegramBot.action('@alerts', (ctx) => ctx.scene.enter(alertSceneId));
telegramBot.command('alerts', (ctx) => ctx.scene.enter(alertSceneId));

await redis.connect();
winston.info(`Connected to redis instance`);

// Restore event sources from redis for each users
for await (const key of redis.scanIterator({
  MATCH: 'user:*',
})) {
  const userId = parseInt(key.split(':')[1]);
  let savedUser: any = {};
  try {
    savedUser = await redis.json.get(key) as any;
  } catch (error) {
    winston.info(`No alerts to restore for user ${userId}`);
  }
  (savedUser.alerts as any[]).forEach(async savedAlert => {
    const schedule = new Schedule(
      savedAlert.schedule.outboundStation,
      savedAlert.schedule.inboundStation,
      new Date(savedAlert.schedule.departureDate));
    winston.info(`Restored alert for user ${userId} in chat ${parseInt(savedUser.chatId)} for ${formatTripSchedule(savedAlert.schedule)} on channel ${savedAlert.channelId}`);
    alerts.subscribe(
      userId,
      parseInt(savedUser.chatId),
      schedule,
      savedAlert.channelId)
    .onUpdate((trips) => telegramBot.telegram.sendMessage(parseInt(savedUser.chatId), formatAlert(trips)));
  });
}

await telegramBot.launch();
winston.info(`Launched Telegram bot`);

process.once('SIGINT', () => {
  redis.disconnect();
  telegramBot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  redis.disconnect();
  telegramBot.stop('SIGTERM');
});