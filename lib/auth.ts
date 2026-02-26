import { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { prisma } from "./prisma"
import {
  persistSessionToken,
  readSessionToken,
  revokeSessionToken,
} from "./session-token-store"

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const SESSION_MAX_AGE_SECONDS = toPositiveInt(
  process.env.SESSION_MAX_AGE_SECONDS,
  7 * 24 * 60 * 60
)
const SESSION_UPDATE_AGE_SECONDS = toPositiveInt(
  process.env.SESSION_UPDATE_AGE_SECONDS,
  12 * 60 * 60
)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

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
    // Keep active users logged in longer while preserving idle timeout policy.
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
