import * as dotenv from 'dotenv';
dotenv.config();
import { Telegraf, session, Scenes } from "telegraf";
import { subscribeScene, subscribeSceneToken } from "./subscribe.js";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
    throw Error('TELEGRAM_BOT_TOKEN must be set.');
}
const stage = new Scenes.Stage([subscribeScene]);
const telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN);
telegramBot.use(session());
telegramBot.use(stage.middleware());
telegramBot.start(ctx => {
    return ctx.replyWithMarkdownV2(`🤖 *Welcome, dear train traveler\\!*\n\nI\\'m a friendly bot whose only wish is to make your train journeys with Uzbekistan Railways _a breeze_\\.\n\nFor now, I can notify you whenever new seats become available, but more features are on the way\\. To get started, subscribe to a trip and I'll handle the rest\\.`, {
        reply_markup: {
            resize_keyboard: true,
            inline_keyboard: [
                [{ text: '⏰ Search for a trip', callback_data: '@subscribe' }]
            ]
        }
    });
});
telegramBot.action('@subscribe', (ctx) => ctx.scene.enter(subscribeSceneToken));
telegramBot.command('subscribe', (ctx) => ctx.scene.enter(subscribeSceneToken));
telegramBot.launch();
process.once('SIGINT', () => telegramBot.stop('SIGINT'));
process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));
