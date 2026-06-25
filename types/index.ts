import { User as PrismaUser } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: string
  }

  interface Session {
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
      role: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}

export type SafeUser = Omit<PrismaUser, "passwordHash" | "accounts" | "sessions">
