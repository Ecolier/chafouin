import { Scenes } from "telegraf";
import { RedisClient } from "./redis";
import { SceneContext } from "telegraf/typings/scenes";
import { savedSubscriptions } from "./subscription.js";
import { tripScheduleEquals } from "chafouin-shared";
import winston from "winston";
import { TripSchedule } from "chafouin-shared";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export const alertSceneId = 'CHFN_ALERT_SCENE';

export const alertScene = (redisClient: RedisClient) => {
  const scene = new Scenes.BaseScene<SceneContext>(alertSceneId);

  scene.enter(async (ctx) => {
    const userId = ctx.callbackQuery?.from.id || ctx.message?.from.id;
    if (!userId) {
      return;
    }
    
    const subscriptions = savedSubscriptions.get(userId);

    let message = `You have no active alert\\.`;
    let keyboard: InlineKeyboardButton[][] = [];

    if (subscriptions && subscriptions.length !== 0) {
      message = `You're currently subscribed to these alerts\\. Delete an alert to stop being notified about a trip\\.`;
      keyboard = [...subscriptions.map(([alert, _]) => [
        { text: `🔕 Unsubscribe from ${alert.outboundStation.substring(0, 3).toUpperCase()} to ${alert.inboundStation.substring(0, 3).toUpperCase()} on the ${new Date(alert.departureDate).toLocaleDateString('fr-FR')}`, 
        callback_data: `@unsubscribe(${alert.outboundStation}, ${alert.inboundStation}, ${alert.departureDate})`}
      ])]
    } 

    if (ctx.updateType === 'callback_query') {
      return ctx.editMessageText(`🔔 *Manage your alerts\\.*\n\n${message}`, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    }

    return ctx.replyWithMarkdownV2(`🔔 *Manage your alerts\\.*\n\n${message}`, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  });
 
  scene.action(/@unsubscribe(?:\((.+)\,\s?(.+)\,\s?(.+)\))?/, async ctx => {
    const userId = ctx.callbackQuery?.from.id;

    const query = {
      outboundStation: ctx.match[1],
      inboundStation: ctx.match[2],
      departureDate: ctx.match[3],
    }

    winston.debug(`unsubscribe from ${query}`)

    let alerts = await redisClient.json.get(`user:${userId}`, {path: '.alerts'}) as unknown as TripSchedule[];
    alerts = alerts.filter(schedule => !tripScheduleEquals(schedule, query));
    redisClient.json.set(`user:${userId}`, '.alerts', alerts as any);

    let subscriptions = savedSubscriptions.get(userId);
    if (!subscriptions) {
      return;
    }

    winston.debug(`find from ${query}`)

    const subscription = subscriptions.find(([schedule, _]) => tripScheduleEquals(query, schedule));
    if (!subscription) {
      return;
    }

    winston.info('Closing source');
    const [schedule, source] = subscription;
    source.close();

    subscriptions = subscriptions.filter(([schedule, _]) => !tripScheduleEquals(query, schedule));
    savedSubscriptions.set(userId, subscriptions);

    return ctx.scene.reenter();
  });

  return scene;
}