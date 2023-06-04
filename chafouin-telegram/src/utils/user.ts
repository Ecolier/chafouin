import { ISchedule } from "chafouin-shared";

export interface Alerts {
  [path: string]: {
    channel: string;
    schedule: ISchedule & {[key: string]: string};
  }
}

export interface User {
  [key: string]: object;
  alerts: Alerts;
}