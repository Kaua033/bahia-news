"use client"

import { useEffect, useRef, useState } from "react"

const FALLBACK_IMG = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/63c5948a8_generated_778f393e.png"
const CARD_IMG_1 = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/33b6b408f_generated_3f966943.png"
const CARD_IMG_2 = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/9d4d581c1_generated_7012979d.png"
const CARD_IMG_3 = "https://media.base44.com/images/public/6a3e9f3196fa26d5be60d39c/4c22afb40_generated_b297efdd.png"

const azulejoColors = [
  "bg-bahia-blue", "bg-accent", "bg-bahia-blue", "bg-accent",
  "bg-accent", "bg-dende", "bg-accent", "bg-bahia-blue",
  "bg-bahia-blue", "bg-accent", "bg-dende", "bg-accent",
  "bg-accent", "bg-bahia-blue", "bg-accent", "bg-bahia-blue",
]

const cardImages = [CARD_IMG_1, CARD_IMG_2, CARD_IMG_3]

const months = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
]
const weekdays = [
  "Domingo","Segunda-feira","Terça-feira","Quarta-feira",
  "Quinta-feira","Sexta-feira","Sábado",
]

function fmt(date: Date) {
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function formatDate(dateStr: string) {
  return fmt(new Date(dateStr))
}

function extractKicker(article: any) {
  const t = (article.title || "").toLowerCase()
  if (t.includes("política") || t.includes("governo") || t.includes("lula") || t.includes("wagner")) return "Política"
  if (t.includes("copa") || t.includes("futebol") || t.includes("bahia") || t.includes("esporte")) return "Esportes"
  if (t.includes("cultura") || t.includes("cinema") || t.includes("música") || t.includes("arte")) return "Cultura"
  if (t.includes("carnaval") || t.includes("bloco") || t.includes("afro")) return "Carnaval"
  if (t.includes("gastronomia") || t.includes("acarajé") || t.includes("comida")) return "Gastronomia"
  if (t.includes("turismo") || t.includes("viagem") || t.includes("praia")) return "Turismo"
  return article.source?.name || "Notícias"
}

interface Article {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

const secoes = ["Todas", "Política", "Cultura", "Carnaval", "Esportes", "Gastronomia", "Turismo"]

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [mounted, setMounted] = useState(false)
  const [secaoAtiva, setSecaoAtiva] = useState("Todas")
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const query = secaoAtiva === "Todas" ? "Bahia" : `${secaoAtiva} Bahia`
    fetch(`/api/news?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || [])
      })
      .catch(console.error)
  }, [secaoAtiva])

  useEffect(() => {
    if (!mounted) return
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-reveal")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    const fadeEls = root.querySelectorAll(".fade-on-scroll")
    fadeEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [mounted, articles])

  const hero = articles[0]
  const sidebar = articles.slice(1, 4)
  const destaques = articles.slice(4, 7)
  const opinioes = articles.slice(7, 10)
  const heroDate = mounted ? fmt(new Date()) : ""

  return (
    <div ref={rootRef}>
      {/* FILTRO DE SEÇÕES */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border pb-4">
          {secoes.map((sec) => (
            <button
              key={sec}
              onClick={() => setSecaoAtiva(sec)}
              className={`font-mono text-xs uppercase tracking-widest transition-colors duration-300 px-3 py-1.5 rounded-full ${
                secaoAtiva === sec
                  ? "bg-accent text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* HERO + SIDEBAR */}
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <article className="fade-on-scroll">
            <div className="relative overflow-hidden border-b-[3px] border-accent">
              <div className="aspect-[16/9]">
                <img
                  src={hero?.urlToImage || FALLBACK_IMG}
                  alt={hero?.title || "Farol da Barra ao entardecer em Salvador, Bahia"}
                  className="size-full object-cover transition-transform duration-600 hover:scale-105"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/65 to-transparent" />
            </div>
            <div className="pt-6">
              {hero && (
                <a href={hero.url} target="_blank" rel="noopener noreferrer">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
                      {extractKicker(hero)}
                    </span>
                  </div>
                  <h2 className="font-display text-4xl font-black leading-tight text-balance sm:text-5xl lg:text-6xl mb-4 cursor-pointer transition-colors duration-300 hover:text-bahia-blue">
                    {hero.title}
                  </h2>
                  <p className="font-display text-lg italic leading-relaxed text-muted-foreground sm:text-xl mb-4">
                    {hero.description}
                  </p>
                </a>
              )}
              {hero && (
                <div className="flex flex-wrap gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="font-semibold text-foreground">{hero.author || hero.source?.name || "Redação"}</span>
                  <span className="text-dende">·</span>
                  <span>{formatDate(hero.publishedAt)}</span>
                  <span className="text-dende">·</span>
                  {mounted && <span>{heroDate}</span>}
                </div>
              )}
            </div>
          </article>

          <aside className="fade-on-scroll border-l-4 border-dende pl-6">
            <h3 className="mb-6 border-b border-dende/30 pb-2 font-mono text-xs font-semibold uppercase tracking-widest text-dende">
              Últimas Notícias
            </h3>

            {sidebar.map((item, i) => (
              <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                <div className="group mb-7 flex cursor-pointer gap-4">
                  <span className="min-w-[52px] font-display text-4xl italic font-bold leading-none text-dende/60 transition-opacity duration-300 group-hover:opacity-100">
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-accent">
                      {extractKicker(item)}
                    </div>
                    <h4 className="font-display text-lg font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-bahia-blue">
                      {item.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}

            <div className="mt-8 border-t border-border pt-6">
              <div className="mx-auto grid max-w-[200px] grid-cols-4 gap-1.5">
                {azulejoColors.map((cor, i) => (
                  <div
                    key={i}
                    className={`aspect-square ${cor} rotate-45 opacity-70 transition-all duration-400 hover:scale-110 hover:opacity-100`}
                  />
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-[200px] text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Azulejos do Pelourinho
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="mb-8 h-0.5 bg-foreground" />
        <h3 className="mb-6 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Destaques da Edição
        </h3>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {destaques.map((card, i) => (
            <a key={card.url} href={card.url} target="_blank" rel="noopener noreferrer">
              <article className="fade-on-scroll group cursor-pointer border-t-2 border-foreground pt-5">
                <div className="relative mb-4 overflow-hidden">
                  <div className="aspect-[4/3]">
                    <img
                      src={card.urlToImage || cardImages[i] || FALLBACK_IMG}
                      alt={card.title}
                      className="size-full object-cover transition-transform duration-600 group-hover:scale-105"
                    />
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent">
                  {extractKicker(card)}
                </span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-bahia-blue">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {card.author || card.source?.name || "Redação"} · {formatDate(card.publishedAt)}
                </div>
              </article>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="mb-8 h-0.5 bg-foreground" />
        <h3 className="mb-6 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Opinião & Análise
        </h3>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {opinioes.map((opinion, i) => (
            <a key={opinion.url} href={opinion.url} target="_blank" rel="noopener noreferrer">
              <article className="fade-on-scroll group cursor-pointer border-t-[3px] border-bahia-blue pt-6">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-bahia-blue">
                  {["Editorial", "Coluna", "Análise"][i] || "Opinião"}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-bahia-blue">
                  {opinion.title}
                </h3>
                <span className="font-mono text-xs tracking-wider text-muted-foreground">
                  {opinion.author || opinion.source?.name || "Redação"}
                </span>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {opinion.description}
                </p>
              </article>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
