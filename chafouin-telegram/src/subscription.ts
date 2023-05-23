import { TripSchedule } from "chafouin-shared";
import EventSource from "eventsource";

export type ScheduleSource = [schedule: TripSchedule, source: EventSource];
export type SavedSubscriptions = Map<number, ScheduleSource[]>;

export const savedSubscriptions = new Map<number, ScheduleSource[]>();