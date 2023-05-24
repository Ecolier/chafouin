import { TripSchedule } from "chafouin-shared";

export function formatTripSchedule(schedule: TripSchedule) {
  return new Date(schedule.departureDate).toLocaleDateString('fr-FR') +
  ` ${schedule.outboundStation.substring(0, 3).toUpperCase()} - ` +
  schedule.inboundStation.substring(0, 3).toUpperCase();
}