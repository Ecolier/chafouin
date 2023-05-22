import * as dotenv from 'dotenv';
dotenv.config();

import { Telegraf, session, Scenes, Context } from "telegraf";
import { BotContext } from "./context.js";
import { subscribeScene, subscribeSceneToken } from "./subscribe.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw Error('TELEGRAM_BOT_TOKEN must be set.');
}

const stage = new Scenes.Stage<BotContext>([subscribeScene])
const telegramBot = new Telegraf<BotContext>(TELEGRAM_BOT_TOKEN);

telegramBot.use(session());
telegramBot.use(stage.middleware());

telegramBot.start(ctx => {
  return ctx.replyWithMarkdownV2(`*Welcome to Chafouin\\!*\n\nI\\'m a bot that makes all your train journeys with Uzbekistan Railways _a breeze_\\!\n\nFor now, I can:\n\n\\- notify you whenever new seats become available\\.\n\nShall we get started\\? 🚂`, { 
    reply_markup: { 
      inline_keyboard: [
        [{text: '⏰ Search for a trip', callback_data: '@subscribe'}]
      ]
    }
  });
});

telegramBot.action('@subscribe', (ctx) => ctx.scene.enter(subscribeSceneToken));
telegramBot.command('subscribe', (ctx) => ctx.scene.enter(subscribeSceneToken));

telegramBot.launch();

process.once('SIGINT', () => telegramBot.stop('SIGINT'));
process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));