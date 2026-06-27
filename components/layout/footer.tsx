import Link from "next/link"

const secoes = [
  { nome: "Política", href: "/categoria/politica" },
  { nome: "Cultura", href: "/categoria/cultura" },
  { nome: "Carnaval", href: "/categoria/carnaval" },
  { nome: "Esportes", href: "/categoria/esportes" },
  { nome: "Gastronomia", href: "/categoria/gastronomia" },
  { nome: "Turismo", href: "/categoria/turismo" },
]

function Fitinhas() {
  const cores = [
    "bg-accent", "bg-dende", "bg-bahia-blue",
    "bg-accent", "bg-dende", "bg-bahia-blue",
  ]

  return (
    <div className="flex justify-center gap-1.5" aria-hidden="true">
      {cores.map((cor, i) => (
        <div key={i} className={`w-1 h-32 ${cor} opacity-90`} />
      ))}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 bg-foreground text-background">
      <div className="pt-6 pb-2">
        <Fitinhas />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h4 className="font-display text-2xl font-bold mb-3">
              DIÁRIO DO FAROL
            </h4>
            <p className="text-sm leading-relaxed text-background/70">
              O jornal da Bahia de Todos os Santos. Compromisso com a verdade,
              paixão pela terra e olho no futuro. Do Pelourinho ao Baixo Sul,
              cobrimos cada canto desse estado com a profundidade que você merece.
            </p>
          </div>

          <div>
            <h5 className="text-xs font-mono font-semibold uppercase tracking-widest mb-4 text-background/50">
              Seções
            </h5>
            <ul className="space-y-2">
              {secoes.map((sec) => (
                <li key={sec.nome}>
                  <Link
                    href={sec.href}
                    className="text-sm text-background/70 hover:text-background transition-colors duration-300"
                  >
                    {sec.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-mono font-semibold uppercase tracking-widest mb-4 text-background/50">
              Criador
            </h5>
            <ul className="space-y-2 text-sm text-background/70">
              <li>Kauã Silva Bispo</li>
              <li>Serra do Ramalho, Bahia</li>
              <li>
                <a
                  href="mailto:kauasilvabispo119@gmail.com"
                  className="hover:text-background transition-colors duration-300"
                >
                  kauasilvabispo119@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-mono font-semibold uppercase tracking-widest mb-4 text-background/50">
              Redação
            </h5>
            <ul className="space-y-2 text-sm text-background/70">
              <li>Diretora de Redação: Caetana Bispo</li>
              <li>Editor-Chefe: Ruy Santos</li>
              <li>Reportagem: Mãe Stella de Oxóssi</li>
              <li>Fotografia: Pierre Verger</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-background/10 pt-6 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-background/40">
            &copy; {new Date().getFullYear()} Diário do Farol. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
