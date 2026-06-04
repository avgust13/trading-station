// Dark palette + fonts, lifted from the original index.html :root variables.

export interface AppTheme {
  colors: {
    bg: string;
    zebra: string;
    fg: string;
    muted: string;
    accent: string;
    price: string;
    green: string;
    red: string;
    border: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
}

export const theme: AppTheme = {
  colors: {
    bg: "#0b0f17",
    zebra: "#0d1320",
    fg: "#e5e7eb",
    muted: "#9ca3af",
    accent: "#60a5fa",
    price: "#93c5fd",
    green: "#22c55e",
    red: "#ef4444",
    border: "#1f2937",
  },
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
};
