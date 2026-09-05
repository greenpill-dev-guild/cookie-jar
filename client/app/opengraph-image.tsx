import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/featured-jar";
import { THEME_COLORS } from "@/lib/app/theme-colors";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
	const c = THEME_COLORS.light;
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: 72,
				background: c.canvas,
				color: c.ink,
				fontFamily: "Inter, system-ui, sans-serif",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 24 }}>
				<div
					style={{
						width: 72,
						height: 72,
						borderRadius: 20,
						background: c.action,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg width="44" height="44" viewBox="0 0 32 32" fill="none">
						<rect x="10" y="3" width="12" height="4" rx="1.5" fill="#fff" />
						<path
							d="M8 9.5C8 8.67 8.67 8 9.5 8h13c.83 0 1.5.67 1.5 1.5V26a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V9.5Z"
							fill="#fff"
							fillOpacity="0.25"
							stroke="#fff"
							strokeWidth="2"
						/>
						<circle cx="16" cy="19" r="4" fill="#fff" />
					</svg>
				</div>
				<div style={{ fontSize: 34, color: c.stone }}>Green Goods</div>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>
					{SITE_NAME}
				</div>
				<div style={{ fontSize: 34, color: c.stone, maxWidth: 980 }}>
					{SITE_DESCRIPTION}
				</div>
			</div>
			<div
				style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}
			>
				<div
					style={{
						width: 18,
						height: 18,
						borderRadius: 9,
						background: c.accent,
					}}
				/>
				<div style={{ color: c.stone }}>Arbitrum One</div>
			</div>
		</div>,
		{ ...size }
	);
}
