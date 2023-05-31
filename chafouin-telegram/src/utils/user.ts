import { ISchedule } from "chafouin-shared";

export interface Alert {
  channelId: string;
  path: string;
  schedule: ISchedule;
}

export interface User {
  alerts: Alert[];
  chatId: number;
}