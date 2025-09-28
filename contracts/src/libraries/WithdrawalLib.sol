// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./CookieJarLib.sol";
import "./CookieJarValidation.sol";

/// @title WithdrawalLib
/// @notice Library to eliminate code duplication in withdrawal functions
/// @dev Unified withdrawal logic for all access types
library WithdrawalLib {
    using SafeERC20 for IERC20;
    
    /// @notice Circular buffer implementation for withdrawal history
    /// @param withdrawalData Storage array for withdrawal history
    /// @param withdrawalIndex Current index in circular buffer
    /// @param maxHistory Maximum history entries
    /// @param amount Withdrawal amount
    /// @param purpose Withdrawal purpose
    /// @param recipient Withdrawal recipient
    function addToWithdrawalHistory(
        CookieJarLib.WithdrawalData[] storage withdrawalData,
        uint256 withdrawalIndex,
        uint256 maxHistory,
        uint256 amount,
        string memory purpose,
        address recipient
    ) internal returns (uint256 newIndex) {
        if (withdrawalData.length < maxHistory) {
            // Array not full yet, can push
            withdrawalData.push(CookieJarLib.WithdrawalData({
                amount: amount,
                purpose: purpose,
                recipient: recipient
            }));
            newIndex = (withdrawalIndex + 1) % maxHistory;
        } else {
            // Use circular buffer - overwrite oldest entry
            uint256 currentIndex = withdrawalIndex % maxHistory;
            withdrawalData[currentIndex] = CookieJarLib.WithdrawalData({
                amount: amount,
                purpose: purpose,
                recipient: recipient
            });
            newIndex = (withdrawalIndex + 1) % maxHistory;
        }
    }
    
    /// @notice Unified withdrawal validation and state update
    /// @param withdrawalOption Withdrawal type (Fixed/Variable)
    /// @param amount Requested withdrawal amount
    /// @param purpose Withdrawal purpose
    /// @param lastWithdrawal Last withdrawal timestamp
    /// @param currencyHeldByJar Current jar balance
    /// @param fixedAmount Fixed withdrawal amount (if applicable)
    /// @param maxWithdrawal Maximum withdrawal amount (if applicable)
    /// @param withdrawalInterval Required time between withdrawals
    /// @param strictPurpose Whether purpose validation is strict
    /// @param oneTimeWithdrawal Whether this is one-time withdrawal only
    /// @param maxWithdrawalPerPeriod Maximum withdrawal per period (0 = unlimited)
    /// @param currentPeriodStart User's current period start
    /// @param withdrawnInCurrentPeriod User's withdrawn amount in current period
    function validateAndPrepareWithdrawal(
        CookieJarLib.WithdrawalTypeOptions withdrawalOption,
        uint256 amount,
        string memory purpose,
        uint256 lastWithdrawal,
        uint256 currencyHeldByJar,
        uint256 fixedAmount,
        uint256 maxWithdrawal,
        uint256 withdrawalInterval,
        bool strictPurpose,
        bool oneTimeWithdrawal,
        uint256 maxWithdrawalPerPeriod,
        uint256 currentPeriodStart,
        uint256 withdrawnInCurrentPeriod
    ) internal view returns (
        uint256 newCurrencyHeld,
        bool needsPeriodReset,
        uint256 newPeriodTotal
    ) {
        // Basic amount validation
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        
        // Use library for validations to reduce contract size
        CookieJarValidation.validatePurpose(strictPurpose, purpose);
        CookieJarValidation.validateOneTimeWithdrawal(oneTimeWithdrawal, lastWithdrawal);
        CookieJarValidation.validateWithdrawalInterval(lastWithdrawal, withdrawalInterval, block.timestamp);
        
        // Period withdrawal limit check
        if (maxWithdrawalPerPeriod > 0) {
            (needsPeriodReset, newPeriodTotal) = CookieJarValidation.validatePeriodLimit(
                maxWithdrawalPerPeriod,
                currentPeriodStart,
                withdrawnInCurrentPeriod,
                amount,
                block.timestamp
            );
        } else {
            needsPeriodReset = false;
            newPeriodTotal = 0;
        }
        
        // Amount limit validation
        CookieJarValidation.validateWithdrawalAmount(withdrawalOption, amount, fixedAmount, maxWithdrawal);
        
        // Balance sufficiency check
        if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();
        
        // Calculate new jar balance
        newCurrencyHeld = currencyHeldByJar - amount;
    }
    
    /// @notice Executes the actual token transfer
    /// @param currency The jar's currency address
    /// @param amount Amount to transfer
    /// @param recipient Recipient address
    /// @param purpose Withdrawal purpose for event
    function executeWithdrawal(
        address currency,
        uint256 amount,
        address recipient,
        string memory purpose
    ) internal {
        emit CookieJarLib.Withdrawal(recipient, amount, purpose);
        
        if (currency == CookieJarLib.ETH_ADDRESS) {
            (bool sent, ) = recipient.call{value: amount}("");
            if (!sent) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(currency).safeTransfer(recipient, amount);
        }
    }
    
    /// @notice Returns updated withdrawal state values
    /// @param needsPeriodReset Whether period needs reset
    /// @param newPeriodTotal New period total amount
    /// @return newPeriodStart Updated period start time
    /// @return newWithdrawnTotal Updated withdrawn total
    function calculateWithdrawalState(
        bool needsPeriodReset,
        uint256 newPeriodTotal
    ) internal view returns (uint256 newPeriodStart, uint256 newWithdrawnTotal) {
        if (needsPeriodReset) {
            newPeriodStart = block.timestamp;
            newWithdrawnTotal = newPeriodTotal;
        } else {
            newPeriodStart = 0; // Indicates no change needed
            newWithdrawnTotal = newPeriodTotal;
        }
    }
    
    /// @notice Complete withdrawal process for any access type
    /// @dev This function combines all the steps to reduce code duplication
    /// @param config Withdrawal configuration struct
    /// @param withdrawalData Storage reference for withdrawal history
    /// @return newCurrencyHeld Updated jar currency balance
    /// @return newWithdrawalIndex Updated withdrawal history index
    /// @return newPeriodStart Updated period start (0 if no change)
    /// @return newWithdrawnTotal Updated withdrawn total for period
    function processWithdrawal(
        WithdrawalConfig memory config,
        CookieJarLib.WithdrawalData[] storage withdrawalData
    ) internal returns (
        uint256 newCurrencyHeld, 
        uint256 newWithdrawalIndex,
        uint256 newPeriodStart,
        uint256 newWithdrawnTotal
    ) {
        // Step 1: Validate and prepare withdrawal
        bool needsPeriodReset;
        uint256 periodTotal;
        
        (newCurrencyHeld, needsPeriodReset, periodTotal) = validateAndPrepareWithdrawal(
            config.withdrawalOption,
            config.amount,
            config.purpose,
            config.lastWithdrawal,
            config.currencyHeldByJar,
            config.fixedAmount,
            config.maxWithdrawal,
            config.withdrawalInterval,
            config.strictPurpose,
            config.oneTimeWithdrawal,
            config.maxWithdrawalPerPeriod,
            config.currentPeriodStart,
            config.withdrawnInCurrentPeriod
        );
        
        // Step 2: Calculate withdrawal state
        (newPeriodStart, newWithdrawnTotal) = calculateWithdrawalState(
            needsPeriodReset,
            periodTotal
        );
        
        // Step 3: Add to withdrawal history
        newWithdrawalIndex = addToWithdrawalHistory(
            withdrawalData,
            config.withdrawalIndex,
            CookieJarLib.MAX_WITHDRAWAL_HISTORY,
            config.amount,
            config.purpose,
            config.recipient
        );
        
        // Step 4: Execute the withdrawal
        executeWithdrawal(config.currency, config.amount, config.recipient, config.purpose);
    }
    
    /// @notice Configuration struct to reduce parameter count
    /// @dev Storage references must be passed separately to functions, not in structs
    struct WithdrawalConfig {
        CookieJarLib.WithdrawalTypeOptions withdrawalOption;
        uint256 amount;
        string purpose;
        uint256 lastWithdrawal;
        uint256 currencyHeldByJar;
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        bool strictPurpose;
        bool oneTimeWithdrawal;
        uint256 maxWithdrawalPerPeriod;
        uint256 currentPeriodStart;
        uint256 withdrawnInCurrentPeriod;
        uint256 withdrawalIndex;
        address currency;
        address recipient;
    }
}
