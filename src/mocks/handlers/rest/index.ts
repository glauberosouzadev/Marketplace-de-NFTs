import type { RequestHandler } from 'msw'
import { nftsHandlers } from './nfts'

export const restHandlers: RequestHandler[] = [...nftsHandlers]
