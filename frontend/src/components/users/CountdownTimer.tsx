import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  lastWithdrawalTimestamp: number; // seconds
  interval: number; // seconds
}

const formatTimeLeft = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  lastWithdrawalTimestamp,
  interval,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const nextWithdrawalTime = lastWithdrawalTimestamp + interval;
      const remaining = nextWithdrawalTime - now;
      setTimeLeft(Math.max(0, remaining));
    };

    updateCountdown(); // call immediately
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [lastWithdrawalTimestamp, interval]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">Time Until Next Withdrawal</span>
      <span
        className={`text-base font-medium break-words px-3 py-1 rounded-md text-white ${
          timeLeft === 0 ? "bg-green-500" : "bg-blue-500"
        }`}
      >
        {timeLeft === 0 ? "unknown" : formatTimeLeft(timeLeft)}
      </span>
    </div>
  );
};
