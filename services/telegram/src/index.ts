import * as dotenv from 'dotenv';

import { Telegraf, session, Scenes } from 'telegraf';

import { SceneContext } from 'telegraf/scenes';
import redis from './redis.js';
import subscribeScene, { subscribeSceneId } from './scenes/subscribe.js';
import alertScene, { alertSceneId } from './scenes/alerts.js';
import * as alert from './utils/alert.js';
import start from './scenes/start.js';
import { logging } from '@chafouin/common';

dotenv.config();
const logger = logging('telegram');

const { TELEGRAM_BOT_TOKEN } = process.env;
if (!TELEGRAM_BOT_TOKEN) {
  throw Error('TELEGRAM_BOT_TOKEN must be set.');
}

const stage = new Scenes.Stage([subscribeScene, alertScene]);

const telegramBot = new Telegraf<SceneContext>(TELEGRAM_BOT_TOKEN);

telegramBot.use(session());
telegramBot.use(stage.middleware());

telegramBot.start(start);

telegramBot.action('@subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));
telegramBot.command('subscribe', (ctx) => ctx.scene.enter(subscribeSceneId));

telegramBot.action('@alerts', (ctx) => ctx.scene.enter(alertSceneId));
telegramBot.command('alerts', (ctx) => ctx.scene.enter(alertSceneId));

await redis.connect();

alert.restore((userId, trips) => {
  telegramBot.telegram.sendMessage(userId, trips.format(), {
    parse_mode: 'MarkdownV2',
  });
});

logger.info('Launch bot');
await telegramBot.launch();

process.once('SIGINT', () => {
  redis.disconnect();
  telegramBot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  redis.disconnect();
  telegramBot.stop('SIGTERM');
});
