import { forwardRef, type AnchorHTMLAttributes } from "react";
import { navigate } from "./router";
export default forwardRef<
	HTMLAnchorElement,
	AnchorHTMLAttributes<HTMLAnchorElement>
>(function AppLink({ href, onClick, ...props }, ref) {
	return (
		<a
			{...props}
			href={href}
			ref={ref}
			onClick={(event) => {
				onClick?.(event);
				if (
					!href ||
					event.defaultPrevented ||
					event.button !== 0 ||
					event.metaKey ||
					event.ctrlKey ||
					event.altKey ||
					event.shiftKey ||
					props.target ||
					props.download !== undefined
				)
					return;
				const url = new URL(href, window.location.origin);
				if (url.origin !== window.location.origin) return;
				event.preventDefault();
				navigate(url.pathname + url.search + url.hash);
			}}
		/>
	);
});
