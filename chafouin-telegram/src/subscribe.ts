import { Scenes } from "telegraf";
import { UZRW_STATIONS } from '../../chafouin-shared/uzrailways/stations.js';
import { TripSchedule, TripUpdate } from '../../chafouin-shared/trip.js';
import { BotContext } from "./context.js";
import { InlineKeyboardButton, ParseMode } from "telegraf/typings/core/types/typegram";
import EventSource from 'eventsource';

const availableStations = Object.values(UZRW_STATIONS);

export const subscribeSceneToken = 'CHFN_SUBSCRIBE_SCENE';
export const subscribeScene = new Scenes.BaseScene<BotContext>(subscribeSceneToken);

const CHAFOUIN_BASE_URL = 'http://localhost:8080';

subscribeScene.enter(ctx => {

  const {inbound, outbound, date} = ctx.scene.state as any;

  let message = '';
  
  if (Object.keys(ctx.scene.state).length === 0) {
    message += '👀 First, let\'s look for a trip\\!';
  }
  
  if (outbound) {
    message += `\n🏠 From *${outbound}*\\.`
  }
  if (inbound) {
    message += `\n📍 To *${inbound}*\\.`
  }
  if (date) {
    message += `\n📆 On the *${new Date(date).toLocaleDateString('fr-FR')}*\\.`
  }

  let keyboard = [
    [{text: '🏠 Outbound station', callback_data: `@selectOutbound`}],
    [{text: '📍 Inbound station', callback_data: `@selectInbound`}],
    [{text: '📆 Date', callback_data: '@selectDate'}], 
    //[{text: '🚅 Type of Train', callback_data: '@selectType'}], 
  ];

  if (inbound && outbound && date) {
    keyboard.push([{text: '🔎 Search', callback_data: '@search'}]);
  }

  const markup = { 
    parse_mode: 'MarkdownV2' as ParseMode,
    reply_markup: {
      inline_keyboard: keyboard,
    }
  };

  if (Object.keys(ctx.scene.state).length === 0) {
    return ctx.sendMessage(message, markup);
  } 
  return ctx.editMessageText(message, markup);
  
});

subscribeScene.action('@search', (ctx) => {
  const {inbound, outbound, date} = ctx.scene.state as any;
  const source = new EventSource(encodeURI(`${CHAFOUIN_BASE_URL}/subscribe?outbound=${outbound}&inbound=${inbound}&seats=true&date=${date}`))
  source.addEventListener('update', function (e) {
    const updatedTrips = JSON.parse(e.data) as TripUpdate[];
    const msg = updatedTrips.reduce((prev, curr) => {
      return prev + `${typeof curr.freeSeats === 'object' ? `${curr.freeSeats.previous} to ${curr.freeSeats.current}` : curr.freeSeats} seats on ${curr.trainId} (${curr.trainType}).\n`
    }, `${new Date(updatedTrips[0].departureDate).toLocaleDateString('en-US')} ${updatedTrips[0].outboundStation.substring(0, 3).toUpperCase()} - ${updatedTrips[0].inboundStation.substring(0, 3).toUpperCase()}\n\n`);
    if (!ctx.chat?.id) {
      source.close();
      return;
    }
    ctx.telegram.sendMessage(ctx.chat.id, msg);
  })
  ctx.reply('✅ Your subscription request was registered.');
});

subscribeScene.action(/@save(?:\((.*)\))?/, ctx => {
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
  const nextButton = {text: '👉 Next', callback_data: `${action}(${next})`};
  const previousButton = {text: '👈 Previous', callback_data: `${action}(${previous})`};
  return [
    ...data.map(stationName => [{text: stationName, callback_data: `${select}({"${key}": "${stationName}"})`}]),
    next !== -1 ? (previous !== -1 ? [previousButton, nextButton] : [nextButton]) : [previousButton],
  ];
}

subscribeScene.action(/@selectOutbound(?:\(([0-9])\))?/g, ctx => {
  const paginatedTrips = paginateTrips(availableStations, 5, parseInt(ctx.match[1] ?? '0'), {
    action: '@selectOutbound', 
    key: 'outbound',
    select: '@save'
  });
  ctx.editMessageReplyMarkup({
    inline_keyboard: paginatedTrips,
  });
});

subscribeScene.action(/@selectInbound(?:\(([0-9])\))?/g, ctx => {
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

subscribeScene.action(/@selectDate(?:\((\d+)\,\s?(\d+)\,\s?(\d+)\))?/, ctx => {

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
      cal[row].push({ text: `${day}`, callback_data: `@save({"date": "${currentYear}-${date.getMonth() + 1}-${day}"})` });
    } else {
      cal[row].push({ text: ` `, callback_data: '@nothing' });
    }
  });

  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {text: `👈 ${lastMonth}`, callback_data: `@selectDate(${date.getDate()}, ${date.getMonth() - 1}, ${date.getFullYear()})` },
        {text: currentMonth, callback_data: 'now' },
        {text: `${nextMonth} 👉`, callback_data: `@selectDate(${date.getDate()}, ${date.getMonth() + 1}, ${date.getFullYear()})` }
      ],
      days.map(day => ({ text: day, callback_data: 'sef' })),
      ...cal
    ]
  });
});

subscribeScene.action('@selectType', ctx => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: availableStations.map((stationName) => [
      {text: stationName, callback_data: JSON.stringify({ inboundStation: stationName }) }
    ])
  });
});