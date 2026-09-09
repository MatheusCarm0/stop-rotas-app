import { createContext, useContext } from "react";

export interface Palette {
  ink: string;      // fundo
  panel: string;    // cartão
  panel2: string;
  line: string;     // borda
  paper: string;    // texto principal
  muted: string;    // texto secundário
  red: string;
  redDeep: string;
  orange: string;
  green: string;
  amber: string;
  blue: string;
  wa: string;
  mapDark: boolean; // usa tiles escuros no mapa
}

export const DARK: Palette = {
  ink: "#121110", panel: "#1b1917", panel2: "#221f1b", line: "#322e28",
  paper: "#f0ebe1", muted: "#9a9285",
  red: "#e1231c", redDeep: "#b31710", orange: "#ff6a13",
  green: "#34d17f", amber: "#ffb020", blue: "#4aa3ff", wa: "#25d366",
  mapDark: true,
};

export const LIGHT: Palette = {
  ink: "#f3efe7", panel: "#ffffff", panel2: "#f6f2ea", line: "#e3ddd0",
  paper: "#1c1916", muted: "#6f685d",
  red: "#d21f18", redDeep: "#a81610", orange: "#e85f0c",
  green: "#1f9d5b", amber: "#b1741a", blue: "#2f7fd6", wa: "#1fae57",
  mapDark: false,
};

export type ThemeMode = "dark" | "light";

interface ThemeCtx {
  mode: ThemeMode;
  colors: Palette;
  setMode: (m: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  mode: "dark",
  colors: DARK,
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// alias legado (usado por telas que permanecem escuras, ex.: comprovante)
export const theme = DARK;
