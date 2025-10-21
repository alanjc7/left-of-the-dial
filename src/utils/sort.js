export const dayOrderIndex = (day) => {
  const order = { 'Thu': 0, 'Fri': 1, 'Sat': 2 };
  return order[day] ?? 99;
};

const timeToMinutes = (time) => {
  const [hours, mins] = String(time).split(':').map(Number);
  return hours * 60 + mins;
};

export const compareShowsByDayThenStart = (a, b) => {
  const d = dayOrderIndex(a.day) - dayOrderIndex(b.day);
  if (d !== 0) return d;
  return timeToMinutes(a.start) - timeToMinutes(b.start);
};


