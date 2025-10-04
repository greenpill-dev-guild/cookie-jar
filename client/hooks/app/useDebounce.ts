import { useEffect, useState } from "react";

/**
 * Custom hook to debounce a value
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

/**
 * Custom hook to debounce a value with loading state
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns Object with debounced value and loading state
 */
export function useDebounceWithLoading<T>(
	value: T,
	delay: number,
): {
	debouncedValue: T;
	isDebouncing: boolean;
} {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	const [isDebouncing, setIsDebouncing] = useState(false);

	useEffect(() => {
		setIsDebouncing(true);

		const handler = setTimeout(() => {
			setDebouncedValue(value);
			setIsDebouncing(false);
		}, delay);

		return () => {
			clearTimeout(handler);
			setIsDebouncing(false);
		};
	}, [value, delay]);

	return { debouncedValue, isDebouncing };
}
