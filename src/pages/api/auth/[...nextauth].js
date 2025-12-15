import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Backend API endpointingizni kiriting
          const res = await fetch("http://10.20.6.129:18080/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            throw new Error("Login failed");
          }

          const user = await res.json();

          // Agar backend token qaytarsa
          if (user && user.token) {
            return {
              id: user.username,
              name: user.username,
              email: `${user.username}@example.com`, // Email kerak bo'lsa
              username: user.username,
              role: user.role,
              accessToken: user.token,
              tokenType: user.type || "Bearer",
            };
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // User birinchi marta login qilganda
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.tokenType = user.tokenType;
      }
      return token;
    },

    async session({ session, token }) {
      // Session objectga token ma'lumotlarini qo'shamiz
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      session.tokenType = token.tokenType;
      return session;
    },
  },

  pages: {
    signIn: "/auth/login", // Custom login page
    error: "/auth/error", // Error page
  },

  session: {
    strategy: "jwt", // JWT strategiyasidan foydalanamiz
    maxAge: 24 * 60 * 60, // 24 soat
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 soat
  },

  secret: process.env.NEXTAUTH_SECRET, // .env faylda NEXTAUTH_SECRET o'rnating
};

export default NextAuth(authOptions);
