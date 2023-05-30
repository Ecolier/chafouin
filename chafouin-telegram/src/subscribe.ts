import { Scenes } from "telegraf";
import { Schedule, Trips, uzrailways } from 'chafouin-shared';
import { InlineKeyboardButton, ParseMode } from "telegraf/typings/core/types/typegram";
import winston from "winston";
import redis from "./redis.js";
import { SceneContext } from "telegraf/typings/scenes/context.js";
import * as alerts from './alerts.js';
import { formatTripSchedule } from "./format-trip-schedule.js";

export function formatAlert(trips: Trips) {
  return trips.trains.reduce((prev, curr) => {
    return prev + `${typeof curr.freeSeats === 'object' ? `${curr.freeSeats.previous} to ${curr.freeSeats.current}` : curr.freeSeats} seats on ${curr.name} (${curr.type}).\n`
  }, `${formatTripSchedule(trips.schedule)}\n\n`);
}

const availableStations = Object.values(uzrailways.stations);
export const subscribeSceneId = 'CHFN_SUBSCRIBE_SCENE';

const scene = new Scenes.BaseScene<SceneContext>(subscribeSceneId);

scene.enter(ctx => {
  const userId = ctx.callbackQuery?.from.id || ctx.message?.from.id;
  (ctx.scene.state as any).user = userId;
  const {inbound, outbound, date} = ctx.scene.state as any;
  
  let message = '🚅 *Let\'s search for a trip\\.*\n\n';
  
  if (outbound) {
    message += `🏠 From *${outbound}*\n`
  }
  if (inbound) {
    message += `📍 To *${inbound}*\n`
  }
  if (date) {
    message += `📆 On the *${new Date(date).toLocaleDateString('fr-FR')}*\n`
  }
  
  let keyboard = [
    [{text: '🏠 Outbound station', callback_data: `@selectOutbound`}],
    [{text: '📍 Inbound station', callback_data: `@selectInbound`}],
    [{text: '📆 Date', callback_data: '@selectDate'}], 
    //[{text: '🚅 Type of Train', callback_data: '@selectType'}], 
  ];
  
  if (inbound && outbound && date) {
    keyboard.push([{text: '🔎 Subscribe', callback_data: '@search'}]);
  }
  
  const markup = { 
    parse_mode: 'MarkdownV2' as ParseMode,
    reply_markup: {
      inline_keyboard: keyboard,
    }
  };
  
  if (Object.keys(ctx.scene.state).length !== 0 && ctx.updateType === 'callback_query') {
    return ctx.editMessageText(message, markup);
  } 
  return ctx.replyWithMarkdownV2(message, markup);
  
});

scene.action('@search', async (ctx) => {
  const userId = ctx.callbackQuery?.from.id;
  const {inbound: inboundStation, outbound: outboundStation, date: departureDate, user} = ctx.scene.state as any;
  
  const schedule = new Schedule(
    outboundStation,
    inboundStation,
    new Date(departureDate)
  );
  
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }
  
  let savedAlert = 
  await redis.json.get(`user:${userId}`, {path: '.alerts'}) as any[];
  
  if (savedAlert && savedAlert.find(alert => schedule.toPath() === alert.schedule.toPath())) {
    winston.info(`User ${userId} is already subscribed to ${formatTripSchedule(schedule)}, aborting subscription`);
    ctx.replyWithMarkdownV2(`⚠️ *Already subscribed\\!*\n\nI'm already notifying you for new seats on this trip\\. Would you like to search for another trip\\?`, {reply_markup: {
      inline_keyboard: [
        [{text: '⏰ Search for another trip', callback_data: '@subscribe'}]
      ]
    }});
  }
  
  else {
    alerts.subscribe(userId, chatId, schedule)
    .onUpdate((trips) => ctx.telegram.sendMessage(chatId, formatAlert(trips)));
    
    ctx.replyWithMarkdownV2(`✅ *Subscription registered\\!*\n\nI'll notify you once new seats are available\\. Would you like to search for another trip\\?`, {reply_markup: {
      inline_keyboard: [
        [{text: '⏰ Search for another trip', callback_data: '@subscribe'}]
      ]
    }});
  }
  
  return ctx.scene.leave();
});

scene.action(/@save(?:\((.*)\))?/, ctx => {
  let data = {};
  try {
    data = JSON.parse(ctx.match[1] ?? {});
  } catch(e) {
    throw 'Cannot save malformed JSON object';
  }
  ctx.scene.state = {...ctx.scene.state, ...data};
  ctx.scene.reenter();
});

const paginate = (array: string[], count: number, page: number) => {
  const hasNextPage = array.length > page * count + count;
  const hasPreviousPage = page > 0;
  return {
    data: array.slice(page * count, page * count + count),
    previous: hasPreviousPage ? page - 1 : -1,
    next: hasNextPage ? page + 1 : -1,
  };
}

const paginateTrips = (array: string[], count: number, page: number, { action, key, select }: {action: string, key: string, select: string}) => {
  const {data, previous, next} = paginate(array, count, page);
  const nextButton = {text: 'Next ➡️', callback_data: `${action}(${next})`};
  const previousButton = {text: '⬅️ Previous', callback_data: `${action}(${previous})`};
  return [
    ...data.map(stationName => [{text: stationName, callback_data: `${select}({"${key}": "${stationName}"})`}]),
    next !== -1 ? (previous !== -1 ? [previousButton, nextButton] : [nextButton]) : [previousButton],
  ];
}

scene.action(/@selectOutbound(?:\(([0-9])\))?/g, ctx => {
  const paginatedTrips = paginateTrips(availableStations, 5, parseInt(ctx.match[1] ?? '0'), {
    action: '@selectOutbound', 
    key: 'outbound',
    select: '@save'
  });
  ctx.editMessageReplyMarkup({
    inline_keyboard: paginatedTrips,
  });
});

scene.action(/@selectInbound(?:\(([0-9])\))?/g, ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: paginateTrips(availableStations, 5, parseInt(ctx.match[1] ?? '0'), {
      action: '@selectInbound', 
      key: 'inbound',
      select: '@save'
    })
  });
});

const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

scene.action(/@selectDate(?:\((\d+)\,\s?(\d+)\,\s?(\d+)\))?/, ctx => {
  
  const day = ctx.match[1];
  const month = ctx.match[2];
  const year = ctx.match[3];
  
  const date = (day && month && year) ? new Date(parseInt(year), parseInt(month), parseInt(day)) : new Date();
  
  const numDaysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayWhen = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const currentYear = date.getFullYear();
  
  const currentMonth = months[date.getMonth()];
  const lastMonth = months[date.getMonth() - 1];
  const nextMonth = months[date.getMonth() + 1];
  
  let cal: InlineKeyboardButton[][] = [];
  
  [...Array(42)].forEach((curr, index) => {
    let row = Math.abs(Math.ceil(index / 7)) - 1;
    if (index % 7 === 0) {
      row += 1;
      cal.push([]);
    }
    
    if (index >= firstDayWhen - 1 && index < numDaysInMonth + firstDayWhen - 1) {
      const day = (index + 1) - (firstDayWhen - 1);
      if (date.getMonth() === new Date().getMonth()) {
        if (day < new Date().getDate()) {
          return cal[row].push({ text: ` `, callback_data: `@nothing` });
        }
      }
      return cal[row].push({ text: `${day}`, callback_data: `@save({"date": "${currentYear}-${date.getMonth() + 1}-${day}"})` });
    } else {
      return cal[row].push({ text: ` `, callback_data: '@nothing' });
    }
  });
  
  const monthsKeyboard = [
    {text: currentMonth, callback_data: 'now' },
    {text: `${nextMonth} ➡️`, callback_data: `@selectDate(${date.getDate()}, ${date.getMonth() + 1}, ${date.getFullYear()})` }
  ];
  
  if (date.getMonth() > new Date().getMonth()) {
    monthsKeyboard.splice(0, 0, {text: `⬅️ ${lastMonth}`, callback_data: `@selectDate(${date.getDate()}, ${date.getMonth() - 1}, ${date.getFullYear()})` })
  }
  
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      monthsKeyboard,
      days.map(day => ({ text: day, callback_data: 'sef' })),
      ...cal
    ]
  });
});

scene.action('@selectType', ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: availableStations.map((stationName) => [
      {text: stationName, callback_data: JSON.stringify({ inboundStation: stationName }) }
    ])
  });
});

export default scene;