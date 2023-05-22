import { SceneContext, SceneSessionData } from "telegraf/typings/scenes";
import { Trip, TripSchedule } from "../../chafouin-shared/trip.js";

export interface SubscribeSceneSessionData extends SceneSessionData {
  searchQuery: TripSchedule;
}

export interface BotContext extends SceneContext<SubscribeSceneSessionData> {}
