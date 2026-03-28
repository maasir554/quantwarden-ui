import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { organization, magicLink } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql", 
  }),
  emailAndPassword: {
    enabled: false // We use Magic Links & Google
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  },
  plugins: [
    organization({
      // The Better Auth organization plugin handles multi-tenancy.
      // We rely on the Custom Role model in Prisma to check custom feature flags.
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        // Here we use Resend
        if (!process.env.RESEND_API_KEY) {
          console.error("Missing RESEND_API_KEY");
          return;
        }
        
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Acme <onboarding@resend.dev>", // replace with verified domain later
            to: [email],
            subject: "Log in to your account",
            html: `<p>Click here to log in: <a href="${url}">Log In</a></p>`,
          }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          console.error("Resend Error:", error);
        }
      },
    }),
  ],
});
