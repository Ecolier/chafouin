import { SceneContext } from "telegraf/typings/scenes";
import { RedisClient } from "./redis";

export default (redisClient: RedisClient) =>
async (ctx: SceneContext) => {
  return ctx.replyWithMarkdownV2(`🤖 *Welcome, dear train traveler\\!*\n\nI\\'m a friendly bot whose only wish is to make your train journeys with Uzbekistan Railways _a breeze_\\.\n\nFor now, I can notify you whenever new seats become available, but more features are on the way\\. To get started, subscribe to a trip and I'll handle the rest\\.`, { 
    reply_markup: {
      resize_keyboard: true, 
      inline_keyboard: [
        [{text: '⏰ Search for a trip', callback_data: '@subscribe'}],
        [{text: '🔔 Your subscriptions', callback_data: '@alert'}],
      ]
    }
  });
}