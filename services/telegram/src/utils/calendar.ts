import { InlineKeyboardButton } from 'telegraf/types'

const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const months = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export default function (year?: number, month?: number, day?: number) {
  const date = day && month && year ? new Date(year, month, day) : new Date();
  console.log(date);

  const numDaysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  const firstDayWhen = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  ).getDay();

  const cal: InlineKeyboardButton[][] = [];

  [...Array(42)].forEach((curr, index) => {
    let row = Math.abs(Math.ceil(index / 7)) - 1;
    if (index % 7 === 0) {
      row += 1;
      cal.push([]);
    }

    if (
      index >= firstDayWhen - 1 &&
      index < numDaysInMonth + firstDayWhen - 1
    ) {
      const day = index + 1 - (firstDayWhen - 1);
      if (date.getMonth() === new Date().getMonth()) {
        if (day < new Date().getDate()) {
          return cal[row].push({ text: ' ', callback_data: '@nothing' });
        }
      }
      return cal[row].push({
        text: `${day}`,
        callback_data: `@save({ "date": "${date.getFullYear()}-${
          date.getMonth() + 1
        }-${day}" })`,
      });
    }
    return cal[row].push({ text: ' ', callback_data: '@nothing' });
  });

  const isFirstMonth = date.getMonth() === 0;
  const isLastMonth = date.getMonth() === 11;
  const nextMonthText = isLastMonth ? months[0] : months[date.getMonth() + 1];
  const prevMonthText = isFirstMonth ? months[11] : months[date.getMonth() - 1];

  const thisYear = date.getFullYear();
  const lastYear = thisYear - 1;
  const nextYear = thisYear + 1;

  console.log(isFirstMonth);

  console.log(
    `@selectDate(${date.getDate()}, ${
      isFirstMonth ? 12 : date.getMonth() - 1
    }, ${isFirstMonth ? lastYear : thisYear})`
  );
  console.log(
    `@selectDate(${date.getDate()}, ${isLastMonth ? 1 : date.getMonth() + 1}, ${
      isLastMonth ? nextYear : thisYear
    })`
  );

  const monthsKeyboard = [
    {
      text: `⬅️ ${prevMonthText}`,
      callback_data: `@selectDate(${date.getDate()}, ${
        isFirstMonth ? 11 : date.getMonth() - 1
      }, ${isFirstMonth ? lastYear : thisYear})`,
    },
    { text: months[date.getMonth()], callback_data: 'now' },
    {
      text: `${nextMonthText} ➡️`,
      callback_data: `@selectDate(${date.getDate()}, ${
        isLastMonth ? 0 : date.getMonth() + 1
      }, ${isLastMonth ? nextYear : thisYear})`,
    },
  ];

  return [
    monthsKeyboard,
    days.map((day) => ({ text: day, callback_data: 'sef' })),
    ...cal,
  ];
}
