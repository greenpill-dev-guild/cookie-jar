import { cn } from "@jar-core/lib/app/utils";
import * as React from "react";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"flex min-h-11 h-11 w-full rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium text-[hsl(var(--cj-input-text))] placeholder:text-[hsl(var(--cj-input-placeholder))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
					className
				)}
				ref={ref}
				// Ensure paste events are not blocked
				onPaste={(e) => {
					// Let the default paste behavior happen
					if (props.onPaste) {
						props.onPaste(e);
					}
				}}
				{...props}
			/>
		);
	}
);
Input.displayName = "Input";

export { Input };
