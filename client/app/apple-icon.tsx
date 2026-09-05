import { ImageResponse } from "next/og";
import { THEME_COLORS } from "@/lib/app/theme-colors";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	const c = THEME_COLORS.light;
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: c.action,
			}}
		>
			<svg width="120" height="120" viewBox="0 0 32 32" fill="none">
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
		</div>,
		{ ...size }
	);
}
