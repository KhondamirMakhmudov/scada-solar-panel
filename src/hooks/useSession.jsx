"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function useSession() {
  const session = useNextAuthSession();

  useEffect(() => {
    // If there's a refresh token error, sign the user out
    if (session?.data?.error === "RefreshAccessTokenError") {
      console.error("Refresh token expired, signing out...");
      signOut({ callbackUrl: "/" });
    }
  }, [session]);

  return session;
}
