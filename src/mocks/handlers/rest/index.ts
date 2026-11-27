import type { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { couponHandlers } from './coupon'
import { nftsHandlers } from './nfts'
import { quotesHandlers } from './quotes'

export const restHandlers: RequestHandler[] = [
  ...nftsHandlers,
  ...authHandlers,
  ...cartHandlers,
  ...couponHandlers,
  ...quotesHandlers,
]
