"use client"

import { useEffect, useState } from "react"

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
        <div className="flex items-center justify-center border-b border-border py-1.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Salvador, BA — {data}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="border-t-4 border-foreground">
          <div className="text-center py-5">
            <h1 className="font-display text-5xl font-black leading-none tracking-tight text-foreground md:text-7xl lg:text-8xl">
              DIÁRIO DO FAROL
            </h1>
          </div>
        </div>
        <div className="border-b-4 border-foreground" />
      </div>
    </header>
  )
}
