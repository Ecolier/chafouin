import * as dotenv from 'dotenv';
dotenv.config();

import winston from 'winston';

import start from './scenes/start.js'

import { Telegraf, session, Scenes } from "telegraf";
import subscribeScene, { subscribeSceneId } from "./scenes/subscribe.js"
import alertScene, { alertSceneId } from './scenes/alerts.js'
import * as alert from './utils/alert.js';

import redis from './redis.js';
import { SceneContext } from 'telegraf/typings/scenes/context.js';

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
alert.restore((userId, trips) => {
  telegramBot.telegram.sendMessage(userId, trips.format(), {
    parse_mode: 'MarkdownV2',
  });
});

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