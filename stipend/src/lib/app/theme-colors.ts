/**
 * Hex mirrors of the Warm Earth tokens in app/globals.css for libraries that need
 * literal colors (RainbowKit, OpenGraph images). Keep in sync with the CSS variables.
 */
export const THEME_COLORS = {
	light: {
		canvas: "#FAF8F5",
		card: "#FFFFFF",
		ink: "#292524",
		stone: "#78716C",
		border: "#E7E5E4",
		accent: "#1FC16B",
		accentInk: "#0B4627",
		action: "#1A7544",
		actionHover: "#16643B",
		amber: "#D97706",
		sky: "#3B82F6",
	},
	dark: {
		canvas: "#1C1917",
		card: "#292524",
		ink: "#F5F5F4",
		stone: "#A8A29E",
		border: "#44403C",
		accent: "#1FC16B",
		accentInk: "#0B4627",
		action: "#1FC16B",
		actionHover: "#22D072",
		amber: "#F59E0B",
		sky: "#60A5FA",
	},
} as const;

export type ThemeMode = keyof typeof THEME_COLORS;
