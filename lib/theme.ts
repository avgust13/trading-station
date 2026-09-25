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
    /** Amber used by warning/alert surfaces (same hue as event.medium). */
    warning: string;
    border: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  /** Border-radius scale shared by every UI primitive. */
  radius: {
    /** Buttons, inputs, small controls. */
    sm: string;
    /** List-item cards. */
    md: string;
    /** Container panels. */
    lg: string;
    /** Fully-rounded pills / chips / badges. */
    pill: string;
  };
  /** Typographic scale (px strings) shared by every UI primitive. */
  fontSize: {
    /** Badges, micro-labels. */
    xs: string;
    /** Helper text, section titles, labels. */
    sm: string;
    /** Default body / subtitles. */
    base: string;
    /** Stat values, selects. */
    md: string;
    /** Numeric inputs. */
    lg: string;
    /** Page titles (h1). */
    title: string;
  };
  /** Semantic colors for calendar event categories (impact + type). */
  event: {
    high: string;
    medium: string;
    low: string;
    earnings: string;
    centralBank: string;
    crypto: string;
  };
  /** Shared page-width tokens so every tab uses horizontal space consistently. */
  layout: {
    /** Legacy narrow width. Pages now standardize on `wide` via the ui Page primitive. */
    content: string;
    /** Standard max page width used by every tab's Page wrapper. */
    wide: string;
    /** Fluid horizontal page padding. */
    gutter: string;
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
    warning: "#f59e0b",
    border: "#1f2937",
  },
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
  radius: {
    sm: "8px",
    md: "10px",
    lg: "12px",
    pill: "999px",
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "15px",
    title: "22px",
  },
  event: {
    high: "#ef4444", // red — high impact
    medium: "#f59e0b", // orange — medium impact
    low: "#9ca3af", // gray — low impact
    earnings: "#60a5fa", // blue — earnings
    centralBank: "#a78bfa", // purple — Fed / central banks
    crypto: "#22c55e", // green — crypto
  },
  layout: {
    content: "1280px",
    wide: "1500px",
    gutter: "clamp(16px, 4vw, 40px)",
  },
};
