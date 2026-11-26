import { restHandlers } from './rest'
import { realtimeHandler } from './ws'

export const handlers = [...restHandlers, realtimeHandler]
