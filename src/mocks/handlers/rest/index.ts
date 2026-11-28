import type { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { avatarHandlers } from './avatar'
import { cartHandlers } from './cart'
import { couponHandlers } from './coupon'
import { favoritesHandlers } from './favorites'
import { nftsHandlers } from './nfts'
import { ordersHandlers } from './orders'
import { profileHandlers } from './profile'
import { quotesHandlers } from './quotes'
import { walletsHandlers } from './wallets'

export const restHandlers: RequestHandler[] = [
  ...nftsHandlers,
  ...authHandlers,
  ...cartHandlers,
  ...couponHandlers,
  ...quotesHandlers,
  ...walletsHandlers,
  ...favoritesHandlers,
  ...ordersHandlers,
  ...profileHandlers,
  ...avatarHandlers,
]
