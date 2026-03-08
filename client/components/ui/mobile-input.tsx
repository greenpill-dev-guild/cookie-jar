"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/app/utils";

export interface MobileInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
	success?: boolean;
	showCharCount?: boolean;
	maxLength?: number;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	onClear?: () => void;
	clearable?: boolean;
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
	(
		{
			className,
			type,
			label,
			error,
			hint,
			success,
			showCharCount,
			maxLength,
			leftIcon,
			rightIcon,
			onClear,
			clearable,
			value,
			...props
		},
		ref,
	) => {
		const [showPassword, setShowPassword] = React.useState(false);
		const [isFocused, setIsFocused] = React.useState(false);

		const isPassword = type === "password";
		const actualType = isPassword && showPassword ? "text" : type;
		const hasValue = value && String(value).length > 0;
		const charCount = String(value || "").length;

		return (
			<div className="w-full space-y-1">
				{/* Label */}
				{label && (
					<Label
						htmlFor={props.id}
						className={cn(
							"text-sm font-medium transition-colors",
							error ? "text-destructive" : "text-foreground",
						)}
					>
						{label}
						{props.required && <span className="text-destructive ml-1">*</span>}
					</Label>
				)}

				{/* Input Container */}
				<div className="relative">
					{/* Left Icon */}
					{leftIcon && (
						<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
							{leftIcon}
						</div>
					)}

					{/* Input */}
					<input
						type={actualType}
						className={cn(
							// Base styles
							"flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base",
							"ring-offset-background transition-all duration-200",

							// Focus styles
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

							// Mobile optimizations
							"touch-manipulation", // Improves touch response
							"text-[16px]", // Prevents zoom on iOS

							// Padding adjustments for icons
							leftIcon && "pl-10",
							(rightIcon || clearable || isPassword) && "pr-12",

							// State styles
							isFocused && "border-ring shadow-sm",
							error && "border-destructive focus-visible:ring-destructive",
							success && "border-green-500 focus-visible:ring-green-500",

							// Disabled state
							"disabled:cursor-not-allowed disabled:opacity-50",

							className,
						)}
						ref={ref}
						value={value}
						maxLength={maxLength}
						onFocus={(e) => {
							setIsFocused(true);
							props.onFocus?.(e);
						}}
						onBlur={(e) => {
							setIsFocused(false);
							props.onBlur?.(e);
						}}
						{...props}
					/>

					{/* Right Icons/Actions */}
					<div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
						{/* Success Icon */}
						{success && !error && <Check className="h-4 w-4 text-green-500" />}

						{/* Error Icon */}
						{error && <X className="h-4 w-4 text-destructive" />}

						{/* Clear Button */}
						{clearable && hasValue && !props.disabled && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 hover:bg-muted"
								onClick={onClear}
								tabIndex={-1}
							>
								<X className="h-3 w-3" />
								<span className="sr-only">Clear input</span>
							</Button>
						)}

						{/* Password Toggle */}
						{isPassword && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 hover:bg-muted"
								onClick={() => setShowPassword(!showPassword)}
								tabIndex={-1}
							>
								{showPassword ? (
									<EyeOff className="h-3 w-3" />
								) : (
									<Eye className="h-3 w-3" />
								)}
								<span className="sr-only">
									{showPassword ? "Hide password" : "Show password"}
								</span>
							</Button>
						)}

						{/* Custom Right Icon */}
						{rightIcon && !isPassword && !clearable && (
							<div className="text-muted-foreground">{rightIcon}</div>
						)}
					</div>
				</div>

				{/* Character Count */}
				{showCharCount && maxLength && (
					<div className="flex justify-end">
						<span
							className={cn(
								"text-xs transition-colors",
								charCount > maxLength * 0.9
									? "text-amber-500"
									: "text-muted-foreground",
								charCount >= maxLength && "text-destructive",
							)}
						>
							{charCount}/{maxLength}
						</span>
					</div>
				)}

				{/* Hint Text */}
				{hint && !error && (
					<p className="text-xs text-muted-foreground">{hint}</p>
				)}

				{/* Error Message */}
				{error && (
					<p className="text-xs text-destructive flex items-center gap-1">
						<X className="h-3 w-3" />
						{error}
					</p>
				)}
			</div>
		);
	},
);

MobileInput.displayName = "MobileInput";

export { MobileInput };

/**
 * Mobile-optimized textarea component
 */
export interface MobileTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	error?: string;
	hint?: string;
	showCharCount?: boolean;
	maxLength?: number;
}

const MobileTextarea = React.forwardRef<
	HTMLTextAreaElement,
	MobileTextareaProps
>(
	(
		{
			className,
			label,
			error,
			hint,
			showCharCount,
			maxLength,
			value,
			...props
		},
		ref,
	) => {
		const [isFocused, setIsFocused] = React.useState(false);
		const charCount = String(value || "").length;

		return (
			<div className="w-full space-y-1">
				{/* Label */}
				{label && (
					<Label
						htmlFor={props.id}
						className={cn(
							"text-sm font-medium transition-colors",
							error ? "text-destructive" : "text-foreground",
						)}
					>
						{label}
						{props.required && <span className="text-destructive ml-1">*</span>}
					</Label>
				)}

				{/* Textarea */}
				<textarea
					className={cn(
						// Base styles
						"flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base",
						"ring-offset-background transition-all duration-200 resize-y",

						// Focus styles
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

						// Mobile optimizations
						"touch-manipulation",
						"text-[16px]", // Prevents zoom on iOS

						// State styles
						isFocused && "border-ring shadow-sm",
						error && "border-destructive focus-visible:ring-destructive",

						// Disabled state
						"disabled:cursor-not-allowed disabled:opacity-50",

						className,
					)}
					ref={ref}
					value={value}
					maxLength={maxLength}
					onFocus={(e) => {
						setIsFocused(true);
						props.onFocus?.(e);
					}}
					onBlur={(e) => {
						setIsFocused(false);
						props.onBlur?.(e);
					}}
					{...props}
				/>

				{/* Character Count */}
				{showCharCount && maxLength && (
					<div className="flex justify-end">
						<span
							className={cn(
								"text-xs transition-colors",
								charCount > maxLength * 0.9
									? "text-amber-500"
									: "text-muted-foreground",
								charCount >= maxLength && "text-destructive",
							)}
						>
							{charCount}/{maxLength}
						</span>
					</div>
				)}

				{/* Hint Text */}
				{hint && !error && (
					<p className="text-xs text-muted-foreground">{hint}</p>
				)}

				{/* Error Message */}
				{error && (
					<p className="text-xs text-destructive flex items-center gap-1">
						<X className="h-3 w-3" />
						{error}
					</p>
				)}
			</div>
		);
	},
);

MobileTextarea.displayName = "MobileTextarea";

export { MobileTextarea };
