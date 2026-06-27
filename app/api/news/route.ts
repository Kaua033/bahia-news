import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limit"
import { newsQuerySchema } from "@/lib/validations"

const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const NEWSAPI_URL = "https://newsapi.org/v2"

export async function GET(request: Request) {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown"

  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    console.warn(`[SECURITY] Rate limit exceeded for News API from IP: ${ip}`)
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get("q") ?? undefined

  const parsed = newsQuerySchema.safeParse({ q: rawQuery })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetro de busca inválido" },
      { status: 400 }
    )
  }

  const query = parsed.data.q

  if (!NEWSAPI_KEY) {
    return NextResponse.json(
      { error: "NEWSAPI_KEY não configurada" },
      { status: 500 }
    )
  }

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
        (article: { title?: string }) =>
          article.title &&
          !article.title.includes("[Removed]")
      )
      .slice(0, 12)

    return NextResponse.json(
      { articles },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      }
    )
  } catch (error) {
    console.error("NewsAPI fetch error:", error)
    return NextResponse.json(
      { error: "Erro interno ao buscar notícias" },
      { status: 500 }
    )
  }
}
