import type { ReactNode } from 'react'
import { Bird, Camera, Play } from 'lucide-react'
import { OutOfScopeButton } from './out-of-scope'

const benefits = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const columns = [
  {
    title: 'Meu perfil',
    links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    links: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
]

const socials: { label: string; icon: ReactNode }[] = [
  { label: 'Facebook', icon: <span className="text-base font-bold">f</span> },
  { label: 'Instagram', icon: <Camera aria-hidden className="size-4" /> },
  { label: 'Twitter', icon: <Bird aria-hidden className="size-4" /> },
  { label: 'LinkedIn', icon: <span className="text-sm font-bold">in</span> },
  { label: 'YouTube', icon: <Play aria-hidden className="size-4" /> },
]

const wallets = ['METAMASK', 'WALLETCONNECT', 'COINBASE']

const focusClass = 'outline-none focus-visible:ring-2 focus-visible:ring-ring'
const linkClass = `rounded-sm text-left text-sm hover:text-price ${focusClass}`

function WalletBadges() {
  return (
    <p
      aria-label="Carteiras compatíveis: MetaMask, WalletConnect, Coinbase"
      className="border-border bg-surface-strong text-price flex w-fit items-center gap-3 rounded-md border px-3 py-1 text-[9px] font-bold"
    >
      {wallets.map((w, i) => (
        <span key={w} aria-hidden className="flex items-center gap-3">
          {i > 0 && <span>·</span>}
          {w}
        </span>
      ))}
    </p>
  )
}

/** Rodapé desktop (>= 1024 px), conforme desktop-pagamento.png; todo item é inerte (Q-08). */
export function Footer() {
  return (
    <footer className="mx-auto mt-20 hidden w-full max-w-[1200px] pb-6 lg:block">
      <div className="bg-card">
        <div className="grid grid-cols-4 px-12 py-8">
          {benefits.map((b) => (
            <section key={b.letter} className="border-primary border-r pr-6 pl-6 first:pl-0">
              <span
                aria-hidden
                className="bg-primary text-primary-foreground grid size-[74px] place-items-center rounded-full text-2xl font-bold"
              >
                {b.letter}
              </span>
              <h2 className="mt-4 text-base font-bold">{b.title}</h2>
              <p className="text-price/80 mt-3 text-sm leading-[22px]">{b.text}</p>
            </section>
          ))}
          <section aria-labelledby="newsletter-title" className="pl-6">
            <h2 id="newsletter-title" className="text-base leading-4 font-bold">
              Antecipe-se ao próximo lançamento
            </h2>
            <div className="mt-4 flex h-10">
              <OutOfScopeButton
                aria-label="E-mail da newsletter"
                className={`bg-surface-strong text-price/70 min-w-0 flex-1 truncate px-3 text-left text-xs ${focusClass}`}
              >
                digite seu e-mail...
              </OutOfScopeButton>
              <OutOfScopeButton
                className={`bg-primary text-primary-foreground hover:bg-price px-4 text-lg font-bold ${focusClass}`}
              >
                Enviar
              </OutOfScopeButton>
            </div>
            <p className="text-price/80 mt-4 text-xs leading-[22px]">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </section>
        </div>

        <div className="bg-surface-strong grid grid-cols-4 items-center px-8 py-6 text-sm">
          <p className="text-xs font-bold tracking-[0.2em]">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p>+55 11 4002 8922</p>
        </div>

        <div className="grid grid-cols-4 gap-6 px-8 py-8">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col items-start gap-3">
              <h2 className="mb-1 text-lg font-bold">{col.title}</h2>
              {col.links.map((label) => (
                <OutOfScopeButton key={label} className={linkClass}>
                  {label}
                </OutOfScopeButton>
              ))}
            </nav>
          ))}
          <div className="flex flex-col items-start">
            <h2 className="mb-3 text-lg font-bold">Redes sociais</h2>
            <ul className="flex gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <OutOfScopeButton
                    aria-label={s.label}
                    className={`border-primary text-price grid size-[30px] place-items-center rounded-sm border ${focusClass}`}
                  >
                    {s.icon}
                  </OutOfScopeButton>
                </li>
              ))}
            </ul>
            <h2 className="mt-8 mb-3 text-lg font-bold">Carteiras compatíveis</h2>
            <WalletBadges />
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
