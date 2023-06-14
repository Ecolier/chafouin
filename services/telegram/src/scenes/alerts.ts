import { Scenes } from 'telegraf';
import { SceneContext } from 'telegraf/scenes';
import { InlineKeyboardButton } from 'telegraf/types';
import { Schedule } from '@chafouin/common';
import * as alerts from '../utils/alert.js';
import redis from '../redis.js';
import { Alerts } from '../utils/user.js';

export const alertSceneId = 'CHFN_ALERT_SCENE';

const scene = new Scenes.BaseScene<SceneContext>(alertSceneId);

scene.enter(async (ctx) => {
  const userId = ctx.callbackQuery?.from.id || ctx.message?.from.id;
  if (!userId) {
    throw Error('Entering scene with no user');
  }
  let message = 'You have no active alert\\.';
  let keyboard: InlineKeyboardButton[][] = [];
  const alerts = (await redis.json.get(`user:${userId}`, {
    path: '.alerts',
  })) as unknown as Alerts;
  if (alerts && Object.keys(alerts).length !== 0) {
    message =
      "You're currently subscribed to these alerts\\. Unsubscribe from an alert to stop being notified about a trip\\.";
    keyboard = [
      ...Object.values(alerts).map(({ schedule }) => [
        {
          text: `🔕 from ${schedule.outboundStation
            .substring(0, 3)
            .toUpperCase()} to ${schedule.inboundStation
            .substring(0, 3)
            .toUpperCase()} on the ${new Date(
            schedule.departureDate
          ).toLocaleDateString('fr-FR')}`,
          callback_data: `@unsubscribe(${schedule.outboundStation}, ${schedule.inboundStation}, ${schedule.departureDate})`,
        },
      ]),
    ];
  }
  if (ctx.updateType === 'callback_query') {
    return ctx.editMessageText(`🔔 *Manage your alerts\\.*\n\n${message}`, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  }
  return ctx.replyWithMarkdownV2(`🔔 *Manage your alerts\\.*\n\n${message}`, {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
});

scene.action(/@unsubscribe(?:\((.+),\s?(.+),\s?(.+)\))?/, async (ctx) => {
  const userId = ctx.callbackQuery?.from.id;
  const schedule = new Schedule(
    ctx.match[1],
    ctx.match[2],
    new Date(ctx.match[3])
  );
  await alerts.unsubscribe(userId, schedule.toPath());
  return ctx.scene.reenter();
});

export default scene;
