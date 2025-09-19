// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/CookieJarLib.sol";

/// @title CookieJarValidation
/// @notice Library for validation logic to reduce main contract size
library CookieJarValidation {
    
    /// @notice Validates withdrawal amount based on withdrawal type
    function validateWithdrawalAmount(
        CookieJarLib.WithdrawalTypeOptions withdrawalOption,
        uint256 amount,
        uint256 fixedAmount,
        uint256 maxWithdrawal
    ) internal pure {
        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, fixedAmount);
            }
        } else {
            if (amount > maxWithdrawal) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, maxWithdrawal);
            }
        }
    }
    
    /// @notice Validates period withdrawal limits
    function validatePeriodLimit(
        uint256 maxWithdrawalPerPeriod,
        uint256 currentPeriodStart,
        uint256 withdrawnInCurrentPeriod,
        uint256 amount,
        uint256 currentTimestamp
    ) internal pure returns (bool needsReset, uint256 newTotal) {
        if (maxWithdrawalPerPeriod == 0) {
            return (false, 0); // No limit
        }
        
        // Check if we're in a new period
        needsReset = currentTimestamp >= currentPeriodStart + CookieJarLib.WITHDRAWAL_PERIOD;
        
        uint256 currentWithdrawn = needsReset ? 0 : withdrawnInCurrentPeriod;
        newTotal = currentWithdrawn + amount;
        
        if (newTotal > maxWithdrawalPerPeriod) {
            uint256 available = maxWithdrawalPerPeriod - currentWithdrawn;
            revert CookieJarLib.PeriodWithdrawalLimitExceeded(amount, available);
        }
    }
    
    /// @notice Validates purpose requirement
    function validatePurpose(bool strictPurpose, string calldata purpose) internal pure {
        if (strictPurpose && bytes(purpose).length < 10) {
            revert CookieJarLib.InvalidPurpose();
        }
    }
    
    /// @notice Validates one-time withdrawal constraint
    function validateOneTimeWithdrawal(bool oneTimeWithdrawal, uint256 lastWithdrawal) internal pure {
        if (oneTimeWithdrawal && lastWithdrawal != 0) {
            revert CookieJarLib.WithdrawalAlreadyDone();
        }
    }
    
    /// @notice Validates withdrawal interval
    function validateWithdrawalInterval(
        uint256 lastWithdrawal,
        uint256 withdrawalInterval,
        uint256 currentTimestamp
    ) internal pure {
        uint256 nextAllowed = lastWithdrawal + withdrawalInterval;
        if (currentTimestamp < nextAllowed) {
            revert CookieJarLib.WithdrawalTooSoon(nextAllowed);
        }
    }
}
