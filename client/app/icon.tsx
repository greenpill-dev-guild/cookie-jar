import { ImageResponse } from "next/og";
import { THEME_COLORS } from "@/lib/app/theme-colors";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
				borderRadius: 8,
			}}
		>
			<svg width="22" height="22" viewBox="0 0 32 32" fill="none">
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
