export function paginate(array: string[], count: number, page: number) {
  const hasNextPage = array.length > page * count + count;
  const hasPreviousPage = page > 0;
  return {
    data: array.slice(page * count, page * count + count),
    previous: hasPreviousPage ? page - 1 : -1,
    next: hasNextPage ? page + 1 : -1,
  };
}

export function inlineKeyboard(
  array: string[],
  count: number,
  page: number,
  { action, key, select }: { action: string; key: string; select: string }
) {
  const { data, previous, next } = paginate(array, count, page);
  const nextButton = { text: 'Next ➡️', callback_data: `${action}(${next})` };
  const previousButton = {
    text: '⬅️ Previous',
    callback_data: `${action}(${previous})`,
  };
  return [
    ...data.map((stationName) => [
      {
        text: stationName,
        callback_data: `${select}({ "${key}": "${stationName}" })`,
      },
    ]),
    next !== -1
      ? previous !== -1
        ? [previousButton, nextButton]
        : [nextButton]
      : [previousButton],
  ];
}
