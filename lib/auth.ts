import { getServerSession, type NextAuthOptions } from "next-auth"
import type { DefaultSession } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { prisma } from "./prisma"
import { HttpError } from "./errors"
import {
  persistSessionToken,
  readSessionToken,
  revokeSessionToken,
} from "./session-token-store"
import {
  isLoginAllowed,
  registerFailedLogin,
  registerSuccessfulLogin,
} from "./login-attempts"

// A bcrypt hash of a long random string. Used to equalize timing when
// the supplied email doesn't match any user — without this, the
// "user not found" branch returns ~immediately while the "wrong
// password" branch waits for bcrypt (~100ms), letting attackers
// enumerate valid emails via response timing.
//
// Computed once at module load so we don't pay the ~100ms hash cost
// on every attempt.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  // Long random string — anything, the value never matches.
  randomUUID() + randomUUID() + randomUUID(),
  12,
)

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

const SESSION_MAX_AGE_SECONDS = toPositiveInt(
  process.env.SESSION_MAX_AGE_SECONDS,
  DEFAULT_SESSION_MAX_AGE_SECONDS
)
const SESSION_UPDATE_AGE_SECONDS = toPositiveInt(
  process.env.SESSION_UPDATE_AGE_SECONDS,
  12 * 60 * 60
)

export async function validateSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }

  return session
}

export type ValidatedSession = {
  user: NonNullable<DefaultSession["user"]> & { id: string }
} & Omit<DefaultSession, "user">

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toString().trim().toLowerCase() ?? ""
        const password = credentials?.password?.toString() ?? ""

        if (!email || !password) {
          return null
        }

        // Identify the caller (best-effort). Used for per-IP brute-force
        // protection.
        const headers = req?.headers ?? {}
        const getHeader = (name: string): string => {
          const value = headers[name]
          if (Array.isArray(value)) return value[0] ?? ""
          return value ?? ""
        }
        const fwd = getHeader("x-forwarded-for")
        const ip = (fwd?.split(",")[0]?.trim()) || getHeader("x-real-ip") || "unknown"

        // Pre-check lockout so an attacker who knows an email can't
        // still probe passwords during the lockout window.
        const allowed = isLoginAllowed(email, ip)
        if (!allowed.allowed) {
          // Intentionally return the same null as a real failure.
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email
          }
        })

        // SECURITY: Always run bcrypt.compare on a known-length hash so
        // the "user not found" branch has the same latency as the
        // "wrong password" branch. Without this, attackers can
        // enumerate valid emails via timing.
        const hashToCompare = user?.password ?? DUMMY_PASSWORD_HASH
        const isPasswordValid = await bcrypt.compare(password, hashToCompare)

        if (!user || !user.isActive || !isPasswordValid) {
          // Record the failed attempt for both per-email and per-IP
          // lockout tracking. The IP path catches attackers spraying
          // multiple emails from one host.
          await registerFailedLogin(email, ip)
          return null
        }

        // Success — clear any partial-failure counters.
        registerSuccessfulLogin(email, ip)

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          position: user.position,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    // Keep sessions effectively persistent unless an explicit override is configured.
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  jwt: {
    async encode({ token, maxAge }) {
      if (!token) {
        return ""
      }

      const sessionToken = typeof token.sid === "string" ? token.sid : randomUUID()
      token.sid = sessionToken

      const userId = typeof token.sub === "string" ? token.sub : null
      if (!userId) {
        return ""
      }

      const expiresAt = new Date(Date.now() + (maxAge ?? SESSION_MAX_AGE_SECONDS) * 1000)
      await persistSessionToken({
        sessionToken,
        payload: token,
        userId,
        expiresAt,
      })

      return sessionToken
    },
    async decode({ token }) {
      if (!token) {
        return null
      }

      const restoredToken = await readSessionToken(token)
      return restoredToken as JWT | null
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }

      if (!token.sid || typeof token.sid !== "string") {
        token.sid = randomUUID()
      }

      if (user) {
        token.role = user.role
        token.department = user.department
        token.position = user.position
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.department = token.department as string
        session.user.position = token.position as string
      }
      return session
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.sid && typeof token.sid === "string") {
        await revokeSessionToken(token.sid)
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
