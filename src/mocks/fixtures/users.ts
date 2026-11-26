import type { Wallet, WalletConnection } from '@/contracts'
import type { MockUser } from '../db/types'

/** PBKDF2-SHA256, 100000 iterações, 32 bytes em hex; salt em hex. Credenciais em fixtures/README.md. */
export const USERS: readonly MockUser[] = [
  {
    id: 'user-001',
    username: 'ana.colecionadora',
    email: 'ana@kurio.test',
    displayName: 'Ana Colecionadora',
    ensName: 'ana.eth',
    version: 1,
    salt: '6b7572696f2d73616c742d31',
    passwordHash: '02d5a522bb507eb1795ae45c5bd70a3196ef9bb49e8d8a6ba6c22244a606c3d5',
  },
  {
    id: 'user-002',
    username: 'bruno.criador',
    email: 'bruno@kurio.test',
    displayName: 'Bruno Criador',
    ensName: 'bruno.eth',
    version: 1,
    salt: '6b7572696f2d73616c742d32',
    passwordHash: '447cb2bf7aeec6f964babef4d9ef043eb40f32d6a700ca031a21dbb6d5baba8c',
  },
]

export const WALLETS: readonly Wallet[] = [
  {
    id: 'wallet-001',
    userId: 'user-001',
    slot: 'primary',
    nickname: 'Carteira principal',
    provider: 'metamask',
    network: 'ethereum',
    address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
    ensName: 'ana.eth',
    displayName: 'Ana Colecionadora',
    profileName: 'ana.colecionadora',
    email: 'ana@kurio.test',
    referralCode: 'ANA2026',
  },
  {
    id: 'wallet-002',
    userId: 'user-001',
    slot: 'secondary',
    nickname: 'Carteira secundária',
    provider: 'walletconnect',
    network: 'polygon',
    address: '0x2a6a3b1f0d9c4e8b7a5f3c1d9e8b7a6c5d4e3f2a',
    displayName: 'Ana Colecionadora',
    profileName: 'ana.colecionadora',
    email: 'ana@kurio.test',
    secondaryRef: 'ana-cofre.eth',
  },
  {
    id: 'wallet-003',
    userId: 'user-002',
    slot: 'primary',
    nickname: 'Carteira principal',
    provider: 'coinbase',
    network: 'solana',
    address: '7Xk9aQ2mPzR4tVb8NcLfH3yJdWe6SgUo1ZiA5nMhKqTp',
    ensName: 'bruno.eth',
    displayName: 'Bruno Criador',
    profileName: 'bruno.criador',
    email: 'bruno@kurio.test',
  },
]

export const WALLET_CONNECTIONS: readonly WalletConnection[] = [
  {
    id: 'conn-001',
    walletId: 'wallet-001',
    provider: 'metamask',
    network: 'ethereum',
    status: 'connected',
  },
  {
    id: 'conn-002',
    walletId: 'wallet-002',
    provider: 'walletconnect',
    network: 'polygon',
    status: 'disconnected',
  },
  {
    id: 'conn-003',
    walletId: 'wallet-003',
    provider: 'coinbase',
    network: 'solana',
    status: 'connected',
  },
]
