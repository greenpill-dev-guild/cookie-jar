import type { SVGProps } from "react";

/**
 * Inline jar glyph used for the header and generated icons (no binary asset needed).
 */
export function BrandMark({
	title = "Green Goods Stipend Jar",
	...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label={title}
			{...props}
		>
			<title>{title}</title>
			<rect x="10" y="3" width="12" height="4" rx="1.5" fill="currentColor" />
			<path
				d="M8 9.5C8 8.67 8.67 8 9.5 8h13c.83 0 1.5.67 1.5 1.5V26a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V9.5Z"
				fill="currentColor"
				fillOpacity="0.18"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<circle cx="16" cy="19" r="4" fill="currentColor" />
		</svg>
	);
}
