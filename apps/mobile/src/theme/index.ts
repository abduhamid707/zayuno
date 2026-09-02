export const colors = {
  background: "#050816",
  backgroundElevated: "#080C1B",
  surface: "#0B1020",
  surfaceRaised: "#11172A",
  surfaceGlass: "rgba(15, 21, 40, 0.88)",
  border: "#242A3A",
  borderSoft: "rgba(139, 147, 167, 0.18)",
  primary: "#2563FF",
  electricBlue: "#168BFF",
  cyan: "#22D3EE",
  purple: "#7C3AED",
  magenta: "#D946EF",
  text: "#F8FAFC",
  secondaryText: "#8B93A7",
  mutedText: "#626B80",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, round: 9999 };
export const typography = {
  sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32, display: 42 },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    bold: "700" as const,
  },
};
export const gradients = {
  brand: ["#22D3EE", "#2563FF", "#7C3AED", "#D946EF"] as const,
  brandCompact: ["#2563FF", "#7C3AED"] as const,
  night: ["#070B1B", "#040612", "#050816"] as const,
  glow: [
    "rgba(34,211,238,0)",
    "rgba(37,99,255,0.32)",
    "rgba(124,58,237,0)",
  ] as const,
};
export const theme = { colors, spacing, radius, typography, gradients };
