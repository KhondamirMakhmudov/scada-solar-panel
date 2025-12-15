import * as React from "react";
import { useState } from "react";
import { Hydrate, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ClientOnlyToaster from "@/components/toast";
import { SessionProvider } from "next-auth/react";
import reactQueryClient from "@/config/react-query";
import { ThemeProvider } from "next-themes";
import CssBaseline from "@mui/material/CssBaseline";
import "@/styles/globals.css";

import theme from "@/components/theme/theme";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  const [queryClient] = useState(() => reactQueryClient);
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps?.dehydratedState}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <CssBaseline />
            <Component {...pageProps} />
          </ThemeProvider>

          <ClientOnlyToaster />
        </Hydrate>
      </QueryClientProvider>
    </SessionProvider>
  );
}
