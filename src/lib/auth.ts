import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

type TokenLike = {
  accessToken?: string
  refreshToken?: string
  accessTokenExpires?: number
  error?: string
}

async function refreshGoogleAccessToken(token: TokenLike): Promise<TokenLike> {
  try {
    if (!token.refreshToken) {
      return { ...token, error: 'NoRefreshToken' }
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const refreshed = await response.json()
    if (!response.ok) {
      throw new Error(refreshed?.error || 'Failed to refresh Google token')
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + (refreshed.expires_in || 3600) * 1000,
      refreshToken: refreshed.refresh_token || token.refreshToken,
    }
  } catch (error) {
    console.error('[auth] refresh token error:', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.compose',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: persist Google tokens in JWT.
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token || token.refreshToken
        token.accessTokenExpires = (account.expires_at || 0) * 1000
      }

      // If token is still valid, return it.
      if (token.accessToken && token.accessTokenExpires && Date.now() < Number(token.accessTokenExpires) - 60_000) {
        return token
      }

      // Otherwise refresh access token using refresh token.
      return await refreshGoogleAccessToken(token as TokenLike)
    },
    async session({ session, token }) {
      ;(session as any).accessToken = (token as any).accessToken
      ;(session as any).refreshToken = (token as any).refreshToken
      ;(session as any).accessTokenExpires = (token as any).accessTokenExpires
      ;(session as any).authError = (token as any).error
      return session
    },
  },
  pages: {
    signIn: '/',
  },
}

