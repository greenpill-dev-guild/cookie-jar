"use client";

import type React from "react";
import { useEffect, useState } from "react";

interface CountdownTimerProps {
	lastWithdrawalTimestamp: number; // seconds
	interval: number; // seconds
	onComplete?: () => void; // callback when timer reaches zero
	/** Inline variant for status cards */
	compact?: boolean;
}

const formatTimeLeft = (seconds: number) => {
	const days = Math.floor(seconds / 86_400);
	const hrs = Math.floor((seconds % 86_400) / 3600)
		.toString()
		.padStart(2, "0");
	const mins = Math.floor((seconds % 3600) / 60)
		.toString()
		.padStart(2, "0");
	const secs = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	return days > 0
		? `${days}d ${hrs}:${mins}:${secs}`
		: `${hrs}:${mins}:${secs}`;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
	lastWithdrawalTimestamp,
	interval,
	onComplete,
	compact = false,
}) => {
	const [timeLeft, setTimeLeft] = useState(0);
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		const updateCountdown = () => {
			const now = Math.floor(Date.now() / 1000);
			const nextWithdrawalTime = lastWithdrawalTimestamp + interval;
			const remaining = nextWithdrawalTime - now;

			if (remaining <= 0) {
				setTimeLeft(0);
				setIsComplete(true);
				if (onComplete) onComplete();
			} else {
				setTimeLeft(remaining);
			}
		};

		updateCountdown(); // call immediately
		const intervalId = setInterval(updateCountdown, 1000);

		return () => clearInterval(intervalId);
	}, [lastWithdrawalTimestamp, interval, onComplete]);

	if (compact) {
		return (
			<div>
				<p className="text-2xl font-mono font-semibold text-foreground">
					{isComplete ? "00:00:00" : formatTimeLeft(timeLeft)}
				</p>
				<p className="text-sm text-muted-foreground">
					{isComplete ? "You can claim now" : "until your next claim"}
				</p>
			</div>
		);
	}

	return (
		<div className="w-full flex flex-col items-center justify-center py-8">
			<h2 className="text-2xl font-semibold text-foreground mb-6">
				Time until your next claim
			</h2>

			<div className="bg-card rounded-xl p-6 shadow-md border border-border w-64 text-center mb-6">
				<span className="text-3xl font-mono font-semibold text-primary">
					{isComplete ? "00:00:00" : formatTimeLeft(timeLeft)}
				</span>
			</div>

			<p className="text-lg font-medium text-muted-foreground">
				{isComplete ? "You can claim now" : "Waiting period active"}
			</p>
		</div>
	);
};
