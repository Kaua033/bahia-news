import { NextResponse } from "next/server"

const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const NEWSAPI_URL = "https://newsapi.org/v2"

const BAHIA_KEYWORDS = [
  "Bahia", "Salvador", "Pelourinho", "Vitória", "BA",
  "acarajé", "Carnaval", "Filhos de Gandhy", "Ilhéus",
  "Porto Seguro", "Morro de São Paulo", "Chapada Diamantina",
  "São João da Bahia", "Recôncavo", "Costa do Descobrimento",
  "baiano", "baiana",
]

export async function GET(request: Request) {
  if (!NEWSAPI_KEY) {
    return NextResponse.json(
      { error: "NEWSAPI_KEY não configurada" },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || "Bahia"

  try {
    const res = await fetch(
      `${NEWSAPI_URL}/everything?q=${encodeURIComponent(
        query
      )}&language=pt&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_KEY}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error("NewsAPI error:", res.status, errorText)
      return NextResponse.json(
        { error: "Erro ao buscar notícias" },
        { status: res.status }
      )
    }

    const data = await res.json()

    const articles = data.articles
      .filter(
        (article: any) =>
          article.title &&
          !article.title.includes("[Removed]")
      )
      .slice(0, 12)

    return NextResponse.json({ articles })
  } catch (error) {
    console.error("NewsAPI fetch error:", error)
    return NextResponse.json(
      { error: "Erro interno ao buscar notícias" },
      { status: 500 }
    )
  }
}
