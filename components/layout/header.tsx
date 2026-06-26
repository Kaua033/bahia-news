"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const secoes = [
  { nome: "Política", href: "/categoria/politica" },
  { nome: "Cultura", href: "/categoria/cultura" },
  { nome: "Carnaval", href: "/categoria/carnaval" },
  { nome: "Esportes", href: "/categoria/esportes" },
  { nome: "Gastronomia", href: "/categoria/gastronomia" },
  { nome: "Turismo", href: "/categoria/turismo" },
  { nome: "Opinião", href: "/categoria/opiniao" },
]

export function Header() {
  const [data, setData] = useState("")

  useEffect(() => {
    const months = [
      "janeiro","fevereiro","março","abril","maio","junho",
      "julho","agosto","setembro","outubro","novembro","dezembro",
    ]
    const weekdays = [
      "Domingo","Segunda-feira","Terça-feira","Quarta-feira",
      "Quinta-feira","Sexta-feira","Sábado",
    ]
    const now = new Date()
    setData(
      `${weekdays[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`,
    )
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between border-b border-border py-1.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Salvador, BA — {data}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors duration-300 hover:text-accent"
            >
              Entrar
            </Link>
            <Link
              href="#"
              className="border border-accent bg-accent px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-background transition-all duration-300 hover:bg-transparent hover:text-accent"
            >
              Assinar
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="border-t-4 border-foreground">
          <div className="text-center py-5">
            <h1 className="font-display text-5xl font-black leading-none tracking-tight text-foreground md:text-7xl lg:text-8xl">
              DIÁRIO DO FAROL
            </h1>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              Jornalismo independente desde a Baía de Todos os Santos
            </div>
          </div>
        </div>
        <div className="border-b-4 border-foreground" />

        <nav className="overflow-x-auto border-b border-border scrollbar-none">
          <ul className="flex items-center justify-center gap-8 px-4 py-3">
            {secoes.map((sec) => (
              <li key={sec.nome}>
                <Link
                  href={sec.href}
                  className="group relative whitespace-nowrap font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent"
                >
                  {sec.nome}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-accent transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
