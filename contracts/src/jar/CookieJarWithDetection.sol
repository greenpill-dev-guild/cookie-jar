// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";

/// @title CookieJarWithDetection
/// @notice Enhanced Cookie Jar with automatic detection and recovery of directly transferred tokens
/// @dev Extends base CookieJar with comprehensive token monitoring and recovery capabilities
contract CookieJarWithDetection is CookieJar {
    using SafeERC20 for IERC20;
    
    // === DETECTION STORAGE ===
    
    /// @notice Last known balance for each monitored token
    mapping(address => uint256) public lastKnownBalance;
    
    /// @notice Whether a token is being monitored for direct transfers
    mapping(address => bool) public monitoredTokens;
    
    /// @notice List of all monitored tokens for iteration
    address[] public monitoredTokenList;
    
    /// @notice Detailed transfer detection data
    struct DetectedTransfer {
        address token;
        uint256 amount;
        uint256 blockNumber;
        uint256 timestamp;
        bool processed;
        address detectedBy; // Who triggered the detection
    }
    
    /// @notice Array of all detected transfers
    DetectedTransfer[] public detectedTransfers;
    
    /// @notice Mapping from token to array of detected transfer indices
    mapping(address => uint256[]) public tokenToTransfers;
    
    /// @notice Auto-processing settings per token
    struct AutoProcessSettings {
        bool enabled;
        uint256 minAmount; // Minimum amount to auto-process
        uint256 maxSlippage; // Maximum slippage in basis points (e.g., 500 = 5%)
        address[] swapPath; // Default swap path
    }
    
    mapping(address => AutoProcessSettings) public autoProcessSettings;

    // === EVENTS ===
    
    event TokenMonitoringEnabled(address indexed token, address indexed enabledBy);
    event TokenMonitoringDisabled(address indexed token, address indexed disabledBy);
    event DirectTransferDetected(
        address indexed token,
        uint256 amount,
        uint256 blockNumber,
        address indexed detectedBy,
        uint256 transferIndex
    );
    event DetectedTransferProcessed(
        address indexed token,
        uint256 amount,
        uint256 amountOut,
        address indexed processedBy,
        uint256 transferIndex
    );
    event AutoProcessingConfigured(
        address indexed token,
        bool enabled,
        uint256 minAmount,
        uint256 maxSlippage
    );
    event BatchScanCompleted(uint256 tokensScanned, uint256 transfersDetected);

    // === ERRORS ===
    
    error TokenNotMonitored();
    error TransferAlreadyProcessed();
    error InvalidTransferIndex();
    error AutoProcessingDisabled();
    error AmountBelowMinimum();

    /// @notice Constructor
    constructor(
        address _jarToken,
        bool _isNativeJarToken,
        address _router,
        address _wNative,
        address _owner
    ) CookieJar(_jarToken, _isNativeJarToken, _router, _wNative, _owner) {}

    // === TOKEN MONITORING FUNCTIONS ===

    /// @notice Enable monitoring for a specific token
    /// @param token Token address to monitor
    function enableTokenMonitoring(address token) external {
        require(token != address(0), "Invalid token address");
        
        if (!monitoredTokens[token]) {
            monitoredTokens[token] = true;
            monitoredTokenList.push(token);
            lastKnownBalance[token] = IERC20(token).balanceOf(address(this));
            emit TokenMonitoringEnabled(token, msg.sender);
        }
    }

    /// @notice Disable monitoring for a specific token
    /// @param token Token address to stop monitoring
    function disableTokenMonitoring(address token) external onlyOwner {
        if (monitoredTokens[token]) {
            monitoredTokens[token] = false;
            
            // Remove from monitoring list
            for (uint256 i = 0; i < monitoredTokenList.length; i++) {
                if (monitoredTokenList[i] == token) {
                    monitoredTokenList[i] = monitoredTokenList[monitoredTokenList.length - 1];
                    monitoredTokenList.pop();
                    break;
                }
            }
            
            emit TokenMonitoringDisabled(token, msg.sender);
        }
    }

    /// @notice Configure auto-processing settings for a token
    /// @param token Token to configure
    /// @param enabled Whether auto-processing is enabled
    /// @param minAmount Minimum amount to trigger auto-processing
    /// @param maxSlippage Maximum slippage in basis points
    /// @param swapPath Default swap path for auto-processing
    function configureAutoProcessing(
        address token,
        bool enabled,
        uint256 minAmount,
        uint256 maxSlippage,
        address[] calldata swapPath
    ) external onlyOwner {
        autoProcessSettings[token] = AutoProcessSettings({
            enabled: enabled,
            minAmount: minAmount,
            maxSlippage: maxSlippage,
            swapPath: swapPath
        });
        
        emit AutoProcessingConfigured(token, enabled, minAmount, maxSlippage);
    }

    // === DETECTION FUNCTIONS ===

    /// @notice Scan all monitored tokens for unexpected balance changes
    /// @return transfersDetected Number of new transfers detected
    function scanAllMonitoredTokens() external returns (uint256 transfersDetected) {
        uint256 initialDetectedCount = detectedTransfers.length;
        
        for (uint256 i = 0; i < monitoredTokenList.length; i++) {
            _scanToken(monitoredTokenList[i]);
        }
        
        transfersDetected = detectedTransfers.length - initialDetectedCount;
        emit BatchScanCompleted(monitoredTokenList.length, transfersDetected);
    }

    /// @notice Scan a specific token for unexpected balance changes
    /// @param token Token to scan
    /// @return detected Whether a transfer was detected
    function scanToken(address token) external returns (bool detected) {
        if (!monitoredTokens[token]) {
            revert TokenNotMonitored();
        }
        
        return _scanToken(token);
    }

    /// @notice Internal function to scan a token for balance changes
    /// @param token Token to scan
    /// @return detected Whether a transfer was detected
    function _scanToken(address token) internal returns (bool detected) {
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        uint256 expectedBalance = lastKnownBalance[token] + pendingTokens[token];
        
        if (currentBalance > expectedBalance) {
            uint256 unexpectedAmount = currentBalance - expectedBalance;
            
            // Create detection record
            DetectedTransfer memory newTransfer = DetectedTransfer({
                token: token,
                amount: unexpectedAmount,
                blockNumber: block.number,
                timestamp: block.timestamp,
                processed: false,
                detectedBy: msg.sender
            });
            
            uint256 transferIndex = detectedTransfers.length;
            detectedTransfers.push(newTransfer);
            tokenToTransfers[token].push(transferIndex);
            
            // Update known balance
            lastKnownBalance[token] = currentBalance;
            
            emit DirectTransferDetected(token, unexpectedAmount, block.number, msg.sender, transferIndex);
            
            // Try auto-processing if enabled
            _tryAutoProcess(token, unexpectedAmount, transferIndex);
            
            return true;
        }
        
        return false;
    }

    /// @notice Try to auto-process a detected transfer
    /// @param token Token that was transferred
    /// @param amount Amount detected
    /// @param transferIndex Index of the detected transfer
    function _tryAutoProcess(address token, uint256 amount, uint256 transferIndex) internal {
        AutoProcessSettings memory settings = autoProcessSettings[token];
        
        if (!settings.enabled || amount < settings.minAmount) {
            return;
        }
        
        // Calculate minimum output with slippage
        uint256 minOut = 0;
        if (settings.maxSlippage > 0) {
            // This is a simplified calculation - in production you'd want more sophisticated pricing
            minOut = amount * (10000 - settings.maxSlippage) / 10000;
        }
        
        try this.processDetectedTransfer(transferIndex, minOut, settings.swapPath) {
            // Auto-processing succeeded
        } catch {
            // Auto-processing failed, leave for manual processing
        }
    }

    // === RECOVERY FUNCTIONS ===

    /// @notice Process a detected transfer by index
    /// @param transferIndex Index of the transfer to process
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Swap path (empty for default)
    function processDetectedTransfer(
        uint256 transferIndex,
        uint256 minOut,
        address[] calldata path
    ) external nonReentrant {
        _processDetectedTransfer(transferIndex, minOut, path);
    }

    /// @notice Internal function to process a detected transfer
    /// @param transferIndex Index of the transfer to process
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Swap path
    function _processDetectedTransfer(
        uint256 transferIndex,
        uint256 minOut,
        address[] memory path
    ) internal {
        if (transferIndex >= detectedTransfers.length) {
            revert InvalidTransferIndex();
        }
        
        DetectedTransfer storage transfer = detectedTransfers[transferIndex];
        
        if (transfer.processed) {
            revert TransferAlreadyProcessed();
        }
        
        transfer.processed = true;
        
        address token = transfer.token;
        uint256 amount = transfer.amount;
        
        if (_isJarToken(token)) {
            // Token is already the jar token
            emit Deposit(address(0), token, amount);
            emit DetectedTransferProcessed(token, amount, amount, msg.sender, transferIndex);
        } else {
            // Swap to jar token
            try this._swapIn(token, amount, minOut, path) returns (uint256 amountOut) {
                emit DepositConverted(address(0), token, amount, _jarTokenAddress(), amountOut);
                emit DetectedTransferProcessed(token, amount, amountOut, msg.sender, transferIndex);
            } catch {
                // Swap failed, add to pending
                pendingTokens[token] += amount;
                emit DepositPendingSwap(address(0), token, amount);
                // Still emit processed event with 0 output
                emit DetectedTransferProcessed(token, amount, 0, msg.sender, transferIndex);
            }
        }
    }

    /// @notice Process all unprocessed detected transfers for a token
    /// @param token Token to process transfers for
    /// @param minOut Minimum amount of jar tokens to receive per transfer
    /// @param path Swap path (empty for default)
    function processAllDetectedTransfers(
        address token,
        uint256 minOut,
        address[] calldata path
    ) external nonReentrant {
        uint256[] memory transferIndices = tokenToTransfers[token];
        
        for (uint256 i = 0; i < transferIndices.length; i++) {
            uint256 transferIndex = transferIndices[i];
            DetectedTransfer storage transfer = detectedTransfers[transferIndex];
            
            if (!transfer.processed) {
                _processDetectedTransfer(transferIndex, minOut, path);
            }
        }
    }

    /// @notice Emergency function to recover any token balance not accounted for
    /// @param token Token to recover
    /// @param amount Amount to recover (0 = all unaccounted)
    /// @param minOut Minimum jar tokens to receive
    /// @param path Swap path
    function emergencyRecover(
        address token,
        uint256 amount,
        uint256 minOut,
        address[] calldata path
    ) external nonReentrant {
        require(!_isJarToken(token), "Cannot recover jar token");
        
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        uint256 accountedBalance = pendingTokens[token];
        
        // Add monitoring if not already monitored
        if (!monitoredTokens[token]) {
            monitoredTokens[token] = true;
            monitoredTokenList.push(token);
            lastKnownBalance[token] = IERC20(token).balanceOf(address(this));
            emit TokenMonitoringEnabled(token, msg.sender);
        }
        
        uint256 unaccountedBalance = currentBalance > accountedBalance ? 
            currentBalance - accountedBalance : 0;
        
        require(unaccountedBalance > 0, "No unaccounted balance");
        
        if (amount == 0) {
            amount = unaccountedBalance;
        } else {
            require(amount <= unaccountedBalance, "Amount exceeds unaccounted balance");
        }
        
        // Create a detected transfer record
        DetectedTransfer memory newTransfer = DetectedTransfer({
            token: token,
            amount: amount,
            blockNumber: block.number,
            timestamp: block.timestamp,
            processed: false,
            detectedBy: msg.sender
        });
        
        uint256 transferIndex = detectedTransfers.length;
        detectedTransfers.push(newTransfer);
        tokenToTransfers[token].push(transferIndex);
        
        emit DirectTransferDetected(token, amount, block.number, msg.sender, transferIndex);
        
        // Process immediately
        _processDetectedTransfer(transferIndex, minOut, path);
        
        // Update known balance
        lastKnownBalance[token] = IERC20(token).balanceOf(address(this));
    }

    // === VIEW FUNCTIONS ===

    /// @notice Get all monitored tokens
    /// @return Array of monitored token addresses
    function getMonitoredTokens() external view returns (address[] memory) {
        return monitoredTokenList;
    }

    /// @notice Get detected transfers for a token
    /// @param token Token address
    /// @return transfers Array of detected transfers for the token
    function getDetectedTransfersForToken(address token) external view returns (DetectedTransfer[] memory transfers) {
        uint256[] memory indices = tokenToTransfers[token];
        transfers = new DetectedTransfer[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            transfers[i] = detectedTransfers[indices[i]];
        }
    }

    /// @notice Get unprocessed detected transfers for a token
    /// @param token Token address
    /// @return transfers Array of unprocessed detected transfers
    function getUnprocessedTransfersForToken(address token) external view returns (DetectedTransfer[] memory transfers) {
        uint256[] memory indices = tokenToTransfers[token];
        uint256 unprocessedCount = 0;
        
        // Count unprocessed transfers
        for (uint256 i = 0; i < indices.length; i++) {
            if (!detectedTransfers[indices[i]].processed) {
                unprocessedCount++;
            }
        }
        
        // Build array of unprocessed transfers
        transfers = new DetectedTransfer[](unprocessedCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < indices.length; i++) {
            DetectedTransfer memory transfer = detectedTransfers[indices[i]];
            if (!transfer.processed) {
                transfers[currentIndex] = transfer;
                currentIndex++;
            }
        }
    }

    /// @notice Get total number of detected transfers
    /// @return Total number of detected transfers across all tokens
    function getTotalDetectedTransfers() external view returns (uint256) {
        return detectedTransfers.length;
    }

    /// @notice Get unaccounted balance for a token
    /// @param token Token to check
    /// @return unaccounted Amount of token balance not accounted for
    function getUnaccountedBalance(address token) external view returns (uint256 unaccounted) {
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        uint256 knownPending = pendingTokens[token];
        uint256 lastKnown = lastKnownBalance[token];
        
        // Calculate expected balance
        uint256 expectedBalance = lastKnown + knownPending;
        
        if (currentBalance > expectedBalance) {
            unaccounted = currentBalance - expectedBalance;
        }
    }

    /// @notice Get auto-processing settings for a token
    /// @param token Token to check
    /// @return settings Auto-processing settings
    function getAutoProcessSettings(address token) external view returns (AutoProcessSettings memory settings) {
        return autoProcessSettings[token];
    }

    // === OVERRIDE FUNCTIONS ===

    /// @notice Override deposit to update known balances
    function deposit(
        address tokenIn,
        uint256 amount,
        uint256 minOut,
        address[] calldata path
    ) external override nonReentrant {
        // Call parent implementation directly
        require(tokenIn != address(0), "Use depositNative for native");
        require(amount > 0, "ZeroAmount");

        // Calculate actual received amount (handles fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(tokenIn).balanceOf(address(this)) - balanceBefore;

        if (_isJarToken(tokenIn)) {
            emit Deposit(msg.sender, tokenIn, received);
        } else {
            // Attempt auto-swap
            try this._swapIn(tokenIn, received, minOut, path) returns (uint256 out) {
                emit DepositConverted(msg.sender, tokenIn, received, _jarTokenAddress(), out);
            } catch {
                pendingTokens[tokenIn] += received;
                emit DepositPendingSwap(msg.sender, tokenIn, received);
            }
        }
        
        // Update known balance if monitored
        if (monitoredTokens[tokenIn]) {
            lastKnownBalance[tokenIn] = IERC20(tokenIn).balanceOf(address(this));
        }
        if (monitoredTokens[_jarTokenAddress()]) {
            lastKnownBalance[_jarTokenAddress()] = IERC20(_jarTokenAddress()).balanceOf(address(this));
        }
    }

    /// @notice Override depositNative to update known balances
    function depositNative(uint256 minOut, address[] calldata path) external payable override nonReentrant {
        // Call parent implementation directly
        _depositNative(msg.sender, msg.value, minOut, path);
        
        // Update known balance if monitored
        if (monitoredTokens[wNative]) {
            lastKnownBalance[wNative] = IERC20(wNative).balanceOf(address(this));
        }
        if (monitoredTokens[_jarTokenAddress()]) {
            lastKnownBalance[_jarTokenAddress()] = IERC20(_jarTokenAddress()).balanceOf(address(this));
        }
    }

    /// @notice Override depositWithPermit to update known balances
    function depositWithPermit(
        address tokenIn,
        uint256 amount,
        uint256 minOut,
        address[] calldata path,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override nonReentrant {
        // Call parent implementation directly
        require(tokenIn != address(0), "Use depositNative for native");
        require(amount > 0, "ZeroAmount");

        // Execute permit
        IERC20Permit(tokenIn).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Calculate actual received amount (handles fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(tokenIn).balanceOf(address(this)) - balanceBefore;

        if (_isJarToken(tokenIn)) {
            emit Deposit(msg.sender, tokenIn, received);
        } else {
            // Attempt auto-swap
            try this._swapIn(tokenIn, received, minOut, path) returns (uint256 out) {
                emit DepositConverted(msg.sender, tokenIn, received, _jarTokenAddress(), out);
            } catch {
                pendingTokens[tokenIn] += received;
                emit DepositPendingSwap(msg.sender, tokenIn, received);
            }
        }
        
        // Update known balance if monitored
        if (monitoredTokens[tokenIn]) {
            lastKnownBalance[tokenIn] = IERC20(tokenIn).balanceOf(address(this));
        }
        if (monitoredTokens[_jarTokenAddress()]) {
            lastKnownBalance[_jarTokenAddress()] = IERC20(_jarTokenAddress()).balanceOf(address(this));
        }
    }
}