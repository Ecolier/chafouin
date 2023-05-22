let cal: number[][] = [];

[...Array(42)].forEach((curr, index) => {
  let row = Math.abs(Math.ceil(index / 7)) - 1;
  if (index % 7 === 0) {
    row += 1;
    cal.push([]);
  }
  cal[row].push(index + 1);
});

console.log(cal)