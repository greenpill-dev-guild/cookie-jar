// WithdrawalHistorySection.tsx - Currently commented out in original code
import React from "react";

interface Withdrawal {
  amount: bigint;
  purpose: string;
}

interface WithdrawalHistorySectionProps {
  pastWithdrawals?: Withdrawal[];
}

export const WithdrawalHistorySection: React.FC<WithdrawalHistorySectionProps> = ({ 
  pastWithdrawals = [] 
}) => {
  return (
    <div className="mt-6">
      <h1 className="text-lg font-semibold mb-2">Past Withdrawals from this Jar</h1>
      {pastWithdrawals.length > 0 ? (
        <ul>
          {pastWithdrawals.map((withdrawal, index) => (
            <li key={index} className="border p-2 mb-2 rounded">
              <p>
                <strong>Amount:</strong> {withdrawal.amount.toString()}
              </p>
              <p>
                <strong>Purpose:</strong> {withdrawal.purpose}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No withdrawal history available</p>
      )}
    </div>
  );
};