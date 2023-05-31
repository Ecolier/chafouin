import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function(year?: number, month?: number, day?: number) {
  const date = (day && month && year) ? new Date(year, month, day) : new Date();
  
  const numDaysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayWhen = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const currentYear = date.getFullYear();
  
  const currentMonth = months[date.getMonth()];
  const lastMonth = months[date.getMonth() - 1];
  const nextMonth = months[date.getMonth() + 1];
  
  const cal: InlineKeyboardButton[][] = [];
  
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

  return [
    monthsKeyboard,
    days.map(day => ({ text: day, callback_data: 'sef' })),
    ...cal
  ];
}