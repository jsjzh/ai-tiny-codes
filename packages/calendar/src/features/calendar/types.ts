export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarWeek = CalendarDay[];

export type MonthView = {
  year: number;
  month: number;
};
