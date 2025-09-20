// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../jar/CookieJarWithDetection.sol";

/// @title CookieJarMonitor
/// @notice Utility contract for batch monitoring and processing of multiple Cookie Jars
/// @dev Provides efficient batch operations for managing multiple jars
contract CookieJarMonitor {
    
    // === EVENTS ===
    
    event BatchScanInitiated(address indexed initiator, address[] jars, address[] tokens);
    event BatchProcessingCompleted(address indexed initiator, uint256 totalProcessed);
    event JarHealthCheck(address indexed jar, bool healthy, string reason);

    // === ERRORS ===
    
    error InvalidInput();
    error UnauthorizedAccess();

    /// @notice Batch scan multiple jars for multiple tokens
    /// @param jars Array of jar addresses to scan
    /// @param tokens Array of tokens to scan for each jar
    /// @return results 2D array of detection results [jar][token] = detected amount
    function batchScanJars(
        address[] calldata jars,
        address[] calldata tokens
    ) external returns (uint256[][] memory results) {
        require(jars.length > 0 && tokens.length > 0, "InvalidInput");
        
        results = new uint256[][](jars.length);
        
        for (uint256 i = 0; i < jars.length; i++) {
            results[i] = new uint256[](tokens.length);
            CookieJarWithDetection jar = CookieJarWithDetection(payable(jars[i]));
            
            for (uint256 j = 0; j < tokens.length; j++) {
                try jar.scanToken(tokens[j]) returns (bool detected) {
                    if (detected) {
                        results[i][j] = jar.getUnaccountedBalance(tokens[j]);
                    }
                } catch {
                    // Token not monitored or other error
                    results[i][j] = 0;
                }
            }
        }
        
        emit BatchScanInitiated(msg.sender, jars, tokens);
    }

    /// @notice Enable monitoring for multiple tokens across multiple jars
    /// @param jars Array of jar addresses
    /// @param tokens Array of tokens to enable monitoring for
    function batchEnableMonitoring(
        address[] calldata jars,
        address[] calldata tokens
    ) external {
        require(jars.length > 0 && tokens.length > 0, "InvalidInput");
        
        for (uint256 i = 0; i < jars.length; i++) {
            CookieJarWithDetection jar = CookieJarWithDetection(payable(jars[i]));
            
            for (uint256 j = 0; j < tokens.length; j++) {
                try jar.enableTokenMonitoring(tokens[j]) {
                    // Successfully enabled monitoring
                } catch {
                    // Already enabled or other error
                }
            }
        }
    }

    /// @notice Batch process detected transfers across multiple jars
    /// @param jars Array of jar addresses
    /// @param tokens Array of tokens to process
    /// @param minOuts Array of minimum outputs for each token
    /// @param paths Array of swap paths for each token
    function batchProcessDetectedTransfers(
        address[] calldata jars,
        address[] calldata tokens,
        uint256[] calldata minOuts,
        address[][] calldata paths
    ) external {
        require(
            jars.length > 0 && 
            tokens.length == minOuts.length && 
            tokens.length == paths.length,
            "InvalidInput"
        );
        
        uint256 totalProcessed = 0;
        
        for (uint256 i = 0; i < jars.length; i++) {
            CookieJarWithDetection jar = CookieJarWithDetection(payable(jars[i]));
            
            for (uint256 j = 0; j < tokens.length; j++) {
                try jar.processAllDetectedTransfers(tokens[j], minOuts[j], paths[j]) {
                    totalProcessed++;
                } catch {
                    // Processing failed or no transfers to process
                }
            }
        }
        
        emit BatchProcessingCompleted(msg.sender, totalProcessed);
    }

    /// @notice Check health of multiple jars
    /// @param jars Array of jar addresses to check
    /// @return healthStatuses Array of health status for each jar
    function batchHealthCheck(address[] calldata jars) external returns (bool[] memory healthStatuses) {
        healthStatuses = new bool[](jars.length);
        
        for (uint256 i = 0; i < jars.length; i++) {
            (bool healthy, string memory reason) = _checkJarHealth(jars[i]);
            healthStatuses[i] = healthy;
            emit JarHealthCheck(jars[i], healthy, reason);
        }
    }

    /// @notice Internal function to check jar health
    /// @param jarAddress Address of the jar to check
    /// @return healthy Whether the jar is healthy
    /// @return reason Reason if not healthy
    function _checkJarHealth(address jarAddress) internal returns (bool healthy, string memory reason) {
        try CookieJarWithDetection(payable(jarAddress)).getTotalDetectedTransfers() returns (uint256 totalDetected) {
            // Check if there are unprocessed transfers
            if (totalDetected > 0) {
                // Get monitored tokens and check for unprocessed transfers
                address[] memory monitoredTokens = CookieJarWithDetection(payable(jarAddress)).getMonitoredTokens();
                
                for (uint256 i = 0; i < monitoredTokens.length; i++) {
                    try CookieJarWithDetection(payable(jarAddress)).getUnprocessedTransfersForToken(monitoredTokens[i]) returns (
                        CookieJarWithDetection.DetectedTransfer[] memory unprocessed
                    ) {
                        if (unprocessed.length > 0) {
                            return (false, "Unprocessed detected transfers");
                        }
                    } catch {
                        return (false, "Error checking transfers");
                    }
                }
            }
            
            return (true, "Healthy");
        } catch {
            return (false, "Contract not responding");
        }
    }

    /// @notice Get comprehensive jar statistics
    /// @param jarAddress Address of the jar
    /// @return totalDetectedTransfers Total number of detected transfers
    /// @return monitoredTokensCount Number of monitored tokens
    /// @return monitoredTokens Array of monitored token addresses
    /// @return unaccountedBalances Array of unaccounted balances
    /// @return pendingBalances Array of pending balances
    function getJarStatistics(address jarAddress) external view returns (
        uint256 totalDetectedTransfers,
        uint256 monitoredTokensCount,
        address[] memory monitoredTokens,
        uint256[] memory unaccountedBalances,
        uint256[] memory pendingBalances
    ) {
        CookieJarWithDetection jar = CookieJarWithDetection(payable(jarAddress));
        
        totalDetectedTransfers = jar.getTotalDetectedTransfers();
        monitoredTokens = jar.getMonitoredTokens();
        monitoredTokensCount = monitoredTokens.length;
        
        unaccountedBalances = new uint256[](monitoredTokensCount);
        pendingBalances = new uint256[](monitoredTokensCount);
        
        for (uint256 i = 0; i < monitoredTokensCount; i++) {
            unaccountedBalances[i] = jar.getUnaccountedBalance(monitoredTokens[i]);
            pendingBalances[i] = jar.pendingTokens(monitoredTokens[i]);
        }
    }

    /// @notice Emergency batch recovery for multiple jars
    /// @param jars Array of jar addresses
    /// @param tokens Array of tokens to recover
    /// @param minOuts Array of minimum outputs
    function emergencyBatchRecover(
        address[] calldata jars,
        address[] calldata tokens,
        uint256[] calldata minOuts
    ) external {
        require(jars.length > 0 && tokens.length == minOuts.length, "InvalidInput");
        
        for (uint256 i = 0; i < jars.length; i++) {
            CookieJarWithDetection jar = CookieJarWithDetection(payable(jars[i]));
            
            for (uint256 j = 0; j < tokens.length; j++) {
                try jar.emergencyRecover(tokens[j], 0, minOuts[j], new address[](0)) {
                    // Recovery successful
                } catch {
                    // Recovery failed or nothing to recover
                }
            }
        }
    }

    /// @notice View function to simulate batch operations without state changes
    /// @param jars Array of jar addresses
    /// @param tokens Array of tokens to check
    /// @return unaccountedBalances 2D array of unaccounted balances
    /// @return pendingBalances 2D array of pending balances
    /// @return isMonitored 2D array of monitoring status
    function simulateBatchOperations(
        address[] calldata jars,
        address[] calldata tokens
    ) external view returns (
        uint256[][] memory unaccountedBalances,
        uint256[][] memory pendingBalances,
        bool[][] memory isMonitored
    ) {
        unaccountedBalances = new uint256[][](jars.length);
        pendingBalances = new uint256[][](jars.length);
        isMonitored = new bool[][](jars.length);
        
        for (uint256 i = 0; i < jars.length; i++) {
            unaccountedBalances[i] = new uint256[](tokens.length);
            pendingBalances[i] = new uint256[](tokens.length);
            isMonitored[i] = new bool[](tokens.length);
            
            CookieJarWithDetection jar = CookieJarWithDetection(payable(jars[i]));
            
            for (uint256 j = 0; j < tokens.length; j++) {
                try jar.getUnaccountedBalance(tokens[j]) returns (uint256 unaccounted) {
                    unaccountedBalances[i][j] = unaccounted;
                } catch {
                    unaccountedBalances[i][j] = 0;
                }
                
                try jar.pendingTokens(tokens[j]) returns (uint256 pending) {
                    pendingBalances[i][j] = pending;
                } catch {
                    pendingBalances[i][j] = 0;
                }
                
                try jar.monitoredTokens(tokens[j]) returns (bool monitored) {
                    isMonitored[i][j] = monitored;
                } catch {
                    isMonitored[i][j] = false;
                }
            }
        }
    }
}