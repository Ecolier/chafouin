import { ISchedule } from '@chafouin/common';
import { TrainFilters } from './alert.js';

export interface Alerts {
  [path: string]: {
    channel: string;
    schedule: ISchedule & { [key: string]: string };
    filters: TrainFilters;
  };
}

export interface User {
  [key: string]: object;
  alerts: Alerts;
}
