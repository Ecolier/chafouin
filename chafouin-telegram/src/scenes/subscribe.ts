import { Scenes } from "telegraf";
import { uzrailways } from 'chafouin-shared';
import { ParseMode } from "telegraf/typings/core/types/typegram";
import winston from "winston";
import redis from "../redis.js";
import { SceneContext } from "telegraf/typings/scenes/context.js";
import {subscribe} from '../utils/alert.js';
import Schedule from "../utils/schedule.js";
import * as paginate from "../utils/paginate.js";
import calendar from "../utils/calendar.js";
import { Alerts } from "../utils/user.js";

export interface SubscribeSceneState {
  outbound: string;
  inbound: string;
  date: string;
}

const availableStations = Object.values(uzrailways.stations);
export const subscribeSceneId = 'CHFN_SUBSCRIBE_SCENE';

const scene = new Scenes.BaseScene<SceneContext>(subscribeSceneId);

scene.enter(ctx => {
  const state = ctx.scene.state as SubscribeSceneState;
  let message = '🚅 *Let\'s search for a trip\\.*\n\n';
  if (state.outbound) {
    message += `🏠 From *${state.outbound}*\n`
  }
  if (state.inbound) {
    message += `📍 To *${state.inbound}*\n`
  }
  if (state.date) {
    message += `📆 On the *${
      new Date(state.date).toLocaleDateString('fr-FR')
    }*\n`
  }
  const keyboard = [
    [{text: '🏠 Outbound station', callback_data: `@selectOutbound`}],
    [{text: '📍 Inbound station', callback_data: `@selectInbound`}],
    [{text: '📆 Date', callback_data: '@selectDate'}], 
  ];
  if (state.inbound && state.outbound && state.date) {
    keyboard.push([{text: '🔎 Subscribe', callback_data: '@search'}]);
  }
  const markup = { 
    parse_mode: 'MarkdownV2' as ParseMode,
    reply_markup: {
      inline_keyboard: keyboard,
    }
  };
  if (Object.keys(ctx.scene.state).length !== 0 &&
  ctx.updateType === 'callback_query') {
    return ctx.editMessageText(message, markup);
  } 
  return ctx.replyWithMarkdownV2(message, markup);
});

scene.action('@search', async (ctx) => {
  const userId = `${ctx.callbackQuery.from.id}`;
  const state = ctx.scene.state as SubscribeSceneState;
  const schedule = new Schedule(
    state.outbound,
    state.inbound,
    new Date(state.date)
  );
  const alerts = await redis.json.get(`user:${userId}`, {
    path: '.alerts'
  }) as unknown as Alerts;
  if (alerts && alerts[schedule.toPath()]) {
    winston.info(`User ${userId} is already subscribed to ` + 
    schedule.toPath());
    ctx.replyWithMarkdownV2(`⚠️ *Already subscribed\\!*\n\nI'm already ` + 
    `notifying you for new seats on this trip\\. Would you like to search ` +
    `for another trip\\?`, {
      reply_markup: {
        inline_keyboard: [
          [{text: '⏰ Search for another trip', callback_data: '@subscribe'}]
        ]
      }
    });
  }
  else {
    subscribe(userId, schedule).onUpdate((trips) => 
      ctx.telegram.sendMessage(userId, trips.format(), {
        parse_mode: 'MarkdownV2'
      })
    );
    ctx.replyWithMarkdownV2(`✅ *Subscription registered\\!*\n\nI'll notify ` + 
    `you once new seats are available\\. Would you like to search for ` + 
    `another trip\\?`, {
      reply_markup: {
        inline_keyboard: [
          [{text: '⏰ Search for another trip', callback_data: '@subscribe'}]
        ]
      }
    });
  }
  return ctx.scene.leave();
});

scene.action(/@save(?:\((.*)\))?/, ctx => {
  let data = {};
  try {
    data = JSON.parse(ctx.match[1] ?? {});
  } catch(e) {
    throw new Error('Cannot save malformed JSON object');
  }
  ctx.scene.state = {...ctx.scene.state, ...data};
  ctx.scene.reenter();
});

scene.action(/@selectOutbound(?:\(([0-9])\))?/g, ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: paginate.inlineKeyboard(availableStations, 5,
      parseInt(ctx.match[1] ?? '0'), {
      action: '@selectOutbound', 
      key: 'outbound',
      select: '@save'
    }),
  });
});

scene.action(/@selectInbound(?:\(([0-9])\))?/g, ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: paginate.inlineKeyboard(availableStations, 5,
      parseInt(ctx.match[1] ?? '0'), {
      action: '@selectInbound', 
      key: 'inbound',
      select: '@save'
    })
  });
});

scene.action(/@selectDate(?:\((\d+)\,\s?(\d+)\,\s?(\d+)\))?/, ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: calendar(
      parseInt(ctx.match[3]),
      parseInt(ctx.match[2]),
      parseInt(ctx.match[1]),
    )
  });
});

export default scene;