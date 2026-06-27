import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

type AllowedRole = "ADMIN" | "EDITOR"

export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}

export async function requireAuth(minRole?: AllowedRole) {
  const user = await getSessionUser()

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      ),
    }
  }

  if (minRole === "ADMIN" && user.role !== "ADMIN") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      ),
    }
  }

  return { user, errorResponse: null }
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN"
}
