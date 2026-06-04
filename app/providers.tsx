"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "styled-components";

import { GlobalStyle } from "@/lib/GlobalStyle";
import { theme } from "@/lib/theme";

/** Wraps the app in the styled-components theme + global styles. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}
