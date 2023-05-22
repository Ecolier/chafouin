import { Scenes } from "telegraf";
import { UZRW_STATIONS } from '../../chafouin-shared/uzrailways/stations';
import { TripSchedule } from '../../chafouin-shared/trip';
import { BotContext } from "./context";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

const availableStations = Object.values(UZRW_STATIONS);

// subscribeWizard.leave((ctx, next) => {
//   const {outbound, inbound, date, type} = ctx.wizard.state.query;
//   console.log(encodeURI(`${CHAFOUIN_BASE_URL}/subscribe?outbound=${outbound}&inbound=${inbound}&date=${date}${type ? `type=${type}` : ''}`));
//   const source = new EventSource(encodeURI(`${CHAFOUIN_BASE_URL}/subscribe?outbound=${outbound}&inbound=${inbound}&seats=true&date=${date}${type ? `type=${type}` : ''}`))
//   source.addEventListener('update', function (e) {
//     const updatedTrips = JSON.parse(e.data);
//     const msg = updatedTrips.reduce((prev, curr) => {
//       return prev + `${typeof curr.freeSeats === 'object' ? `${curr.freeSeats.previous} to ${curr.freeSeats.current}` : curr.freeSeats} seats on ${curr.trainId} (${curr.trainType}).\n`
//     }, `${new Date(updatedTrips[0].departureDate).toLocaleDateString('en-US')} ${updatedTrips[0].outboundStation.substring(0, 3).toUpperCase()} - ${updatedTrips[0].inboundStation.substring(0, 3).toUpperCase()}\n\n`);
//     ctx.telegram.sendMessage(ctx.chat?.id, msg);
//   })
//   ctx.reply('Your subscription request was registered');
// });

export const subscribeSceneToken = 'CHFN_SUBSCRIBE_SCENE';
export const subscribeScene = new Scenes.BaseScene<BotContext>(subscribeSceneToken);

subscribeScene.enter(ctx => {
  const state = ctx.scene.state as any;
  if (!('searchQuery' in state)) {
    state.searchQuery = {};
  }
  const {inboundStation, outboundStation, departureDate} = state.searchQuery as TripSchedule;
  
  let message = '👀 First, let\'s look for a trip\\!';
  
  if (outboundStation) {
    message += `\n\n🏠 From *${outboundStation}*`
  }
  if (inboundStation) {
    message += `\n\n➡️ To *${inboundStation}*`
  }
  
  ctx.editMessageText(message, { 
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{text: '🏠 Outbound station', callback_data: `@selectOutbound`}],
        [{text: '📍 Inbound station', callback_data: `@selectInbound`}],
        [{text: '📆 Date', callback_data: '@selectDate'}], 
        [{text: '🚅 Type of Train', callback_data: '@selectType'}], 
      ]
    }
  })
})

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
    key: 'outboundStation',
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
      key: 'inboundStation',
      select: '@save'
    })
  });
});

const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

subscribeScene.action(/@selectDate(?:\((\d+)\,\s?(\d+)\,\s?(\d+)\))?/, ctx => {
  const date = new Date();

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
    cal[row].push({ text: `${index + 1}`, callback_data: 'sef' });
  });

  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {text: `👈 ${lastMonth}`, callback_data: 'previous' },
        {text: currentMonth, callback_data: 'now' },
        {text: `${nextMonth} 👉`, callback_data: 'next' }
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