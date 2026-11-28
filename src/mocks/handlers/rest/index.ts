import type { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { couponHandlers } from './coupon'
import { nftsHandlers } from './nfts'
import { ordersHandlers } from './orders'
import { quotesHandlers } from './quotes'
import { walletsHandlers } from './wallets'

export const restHandlers: RequestHandler[] = [
  ...nftsHandlers,
  ...authHandlers,
  ...cartHandlers,
  ...couponHandlers,
  ...quotesHandlers,
  ...walletsHandlers,
  ...ordersHandlers,
]
