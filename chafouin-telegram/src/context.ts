import { SceneContext, SceneSessionData } from "telegraf/typings/scenes";
import { TripSchedule } from 'chafouin-shared'

export interface SubscribeSceneSessionData extends SceneSessionData {
  searchQuery: TripSchedule;
}

export interface BotContext extends SceneContext<SubscribeSceneSessionData> {}
