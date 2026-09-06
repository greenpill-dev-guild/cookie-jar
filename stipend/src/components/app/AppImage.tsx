import type { ImgHTMLAttributes } from "react";
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
	src: string;
	fill?: boolean;
	priority?: boolean;
};
export default function AppImage({
	fill,
	priority,
	style,
	alt,
	...props
}: Props) {
	return (
		<img
			{...props}
			alt={alt || ""}
			loading={priority ? "eager" : "lazy"}
			decoding="async"
			style={{
				...(fill
					? ({
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
						} as const)
					: {}),
				...style,
			}}
		/>
	);
}
