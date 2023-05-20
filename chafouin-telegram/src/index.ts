require('dotenv').config();
import { request } from "https";
import { Telegraf, session, Scenes } from "telegraf";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw Error('TELEGRAM_BOT_TOKEN must be set.');
}

const CHAFOUIN_BASE_URL = 'https://5cb6-185-213-230-82.in.ngrok.io';

const notificationWizardId = 'CHFN_NOTIFICATIONS_WIZARD_ID';

const telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN);

telegramBot.use(session());

telegramBot.start(async (ctx) => {
  const req = request(`${CHAFOUIN_BASE_URL}/subscribe?outbound=tashkent&inbound=samarkand&date=2023-05-20`);
  req.on('response', (res) => console.log(res))
});

telegramBot.launch();

process.once('SIGINT', () => telegramBot.stop('SIGINT'));
process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));