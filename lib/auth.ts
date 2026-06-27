import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { loginSchema } from "./validations"
import { checkRateLimit } from "./rate-limit"

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function getClientIp(): string {
  return "global"
}

function isLockedOut(identifier: string): boolean {
  const entry = loginAttempts.get(identifier)
  if (!entry) return false
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(identifier)
    return false
  }
  return true
}

function recordFailedAttempt(identifier: string) {
  const entry = loginAttempts.get(identifier) ?? { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
  }
  loginAttempts.set(identifier, entry)
}

function clearAttempts(identifier: string) {
  loginAttempts.delete(identifier)
}

export const authOptions: NextAuthOptions = {
  // @ts-expect-error - adapter type mismatch between @auth/prisma-adapter and next-auth
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  jwt: {
    maxAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const ip = getClientIp()

        const rateCheck = checkRateLimit(ip)
        if (!rateCheck.allowed) {
          console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip}`)
          return null
        }

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          console.warn(`[SECURITY] Invalid login payload from IP: ${ip}`)
          return null
        }

        const { email, password } = parsed.data

        if (isLockedOut(email)) {
          console.warn(`[SECURITY] Account locked due to many attempts: ${email}`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash || !user.isActive) {
          recordFailedAttempt(email)
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          recordFailedAttempt(email)
          console.warn(`[SECURITY] Failed login attempt for: ${email} from IP: ${ip}`)
          return null
        }

        clearAttempts(email)
        console.info(`[SECURITY] Successful login: ${email} from IP: ${ip}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
