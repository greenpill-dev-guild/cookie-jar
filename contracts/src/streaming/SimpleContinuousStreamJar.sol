// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../jar/CookieJarWithDetection.sol";

/// @title SimpleContinuousStreamJar
/// @notice Cookie Jar with built-in continuous streaming protocol (no external dependencies)
/// @dev Implements per-second streaming with automatic jar token conversion
contract SimpleContinuousStreamJar is CookieJarWithDetection {
    using SafeERC20 for IERC20;
    
    // === STREAMING CORE ===
    
    /// @notice Stream definition
    struct Stream {
        address sender;             // Who is streaming
        address token;              // What token is being streamed
        uint256 ratePerSecond;      // Tokens per second (in token decimals)
        uint256 startTime;          // When stream started
        uint256 stopTime;           // When stream stops (0 = indefinite)
        uint256 lastClaimed;        // Last time stream was claimed/processed
        uint256 totalStreamed;      // Total amount streamed so far
        bool isActive;              // Whether stream is active
        bool autoSwap;              // Whether to auto-swap to jar token
        uint256 minOut;             // Minimum jar tokens per swap
    }
    
    /// @notice All streams
    Stream[] public streams;
    
    /// @notice Mapping from sender+token to stream index
    mapping(address => mapping(address => uint256)) public senderTokenToStreamIndex;
    
    /// @notice Whether a sender+token combination has an active stream
    mapping(address => mapping(address => bool)) public hasActiveStream;
    
    /// @notice Stream balances (deposited but not yet streamed)
    mapping(uint256 => uint256) public streamBalances;
    
    /// @notice Minimum stream duration (prevents spam)
    uint256 public constant MIN_STREAM_DURATION = 1 hours;
    
    /// @notice Maximum stream rate (prevents overflow)
    uint256 public constant MAX_RATE_PER_SECOND = 1e24; // 1M tokens per second max

    // === EVENTS ===
    
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed token,
        uint256 ratePerSecond,
        uint256 duration,
        bool autoSwap
    );
    
    event StreamFunded(
        uint256 indexed streamId,
        address indexed funder,
        uint256 amount
    );
    
    event StreamClaimed(
        uint256 indexed streamId,
        address indexed claimer,
        uint256 amount,
        uint256 jarTokensReceived
    );
    
    event StreamStopped(
        uint256 indexed streamId,
        address indexed sender,
        uint256 remainingBalance
    );

    // === ERRORS ===
    
    error StreamAlreadyExists();
    error StreamNotFound();
    error StreamNotActive();
    error InvalidStreamRate();
    error InvalidStreamDuration();
    error InsufficientStreamBalance();
    error UnauthorizedStreamAccess();
    error NothingToClaim();

    /// @notice Constructor
    constructor(
        address _jarToken,
        bool _isNativeJarToken,
        address _router,
        address _wNative,
        address _owner
    ) CookieJarWithDetection(_jarToken, _isNativeJarToken, _router, _wNative, _owner) {}

    // === STREAM CREATION ===

    /// @notice Create a new continuous stream
    /// @param token Token to stream
    /// @param ratePerSecond Tokens per second to stream
    /// @param duration Stream duration in seconds (0 = indefinite)
    /// @param autoSwap Whether to auto-swap to jar token
    /// @param minOut Minimum jar tokens per swap
    /// @return streamId The created stream ID
    function createStream(
        address token,
        uint256 ratePerSecond,
        uint256 duration,
        bool autoSwap,
        uint256 minOut
    ) external nonReentrant returns (uint256 streamId) {
        require(token != address(0), "Invalid token");
        require(ratePerSecond > 0 && ratePerSecond <= MAX_RATE_PER_SECOND, "Invalid rate");
        require(duration == 0 || duration >= MIN_STREAM_DURATION, "Duration too short");
        require(!hasActiveStream[msg.sender][token], "Stream already exists");
        
        // Calculate stop time
        uint256 stopTime = duration > 0 ? block.timestamp + duration : 0;
        
        // Create stream
        streamId = streams.length;
        streams.push(Stream({
            sender: msg.sender,
            token: token,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            stopTime: stopTime,
            lastClaimed: block.timestamp,
            totalStreamed: 0,
            isActive: true,
            autoSwap: autoSwap,
            minOut: minOut
        }));
        
        // Update mappings
        senderTokenToStreamIndex[msg.sender][token] = streamId;
        hasActiveStream[msg.sender][token] = true;
        
        emit StreamCreated(streamId, msg.sender, token, ratePerSecond, duration, autoSwap);
    }

    /// @notice Deposit tokens to fund a stream
    /// @param streamId Stream to fund
    /// @param amount Amount to deposit
    function fundStream(uint256 streamId, uint256 amount) external nonReentrant {
        require(streamId < streams.length, "Stream not found");
        require(amount > 0, "Zero amount");
        
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        
        // Transfer tokens to contract
        IERC20(stream.token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Add to stream balance
        streamBalances[streamId] += amount;
        
        emit StreamFunded(streamId, msg.sender, amount);
    }

    // === STREAM PROCESSING ===

    /// @notice Claim available tokens from a stream
    /// @param streamId Stream to claim from
    /// @return claimedAmount Amount claimed
    /// @return jarTokensReceived Jar tokens received (if swapped)
    function claimStream(uint256 streamId) external nonReentrant returns (
        uint256 claimedAmount,
        uint256 jarTokensReceived
    ) {
        require(streamId < streams.length, "Stream not found");
        
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        
        // Calculate claimable amount
        claimedAmount = getClaimableAmount(streamId);
        require(claimedAmount > 0, "Nothing to claim");
        require(streamBalances[streamId] >= claimedAmount, "Insufficient stream balance");
        
        // Update stream state
        stream.lastClaimed = block.timestamp;
        stream.totalStreamed += claimedAmount;
        streamBalances[streamId] -= claimedAmount;
        
        // Check if stream should stop
        if (stream.stopTime > 0 && block.timestamp >= stream.stopTime) {
            stream.isActive = false;
            hasActiveStream[stream.sender][stream.token] = false;
        }
        
        // Process the claimed amount
        if (_isJarToken(stream.token)) {
            // Direct deposit
            jarTokensReceived = claimedAmount;
            emit Deposit(stream.sender, stream.token, claimedAmount);
        } else if (stream.autoSwap) {
            // Auto-swap to jar token
            try this._swapIn(stream.token, claimedAmount, stream.minOut, new address[](0)) returns (uint256 amountOut) {
                jarTokensReceived = amountOut;
                emit DepositConverted(stream.sender, stream.token, claimedAmount, _jarTokenAddress(), amountOut);
            } catch {
                // Swap failed - add to pending
                pendingTokens[stream.token] += claimedAmount;
                emit DepositPendingSwap(stream.sender, stream.token, claimedAmount);
                jarTokensReceived = 0;
            }
        } else {
            // No auto-swap - add to pending
            pendingTokens[stream.token] += claimedAmount;
            emit DepositPendingSwap(stream.sender, stream.token, claimedAmount);
            jarTokensReceived = 0;
        }
        
        emit StreamClaimed(streamId, msg.sender, claimedAmount, jarTokensReceived);
    }

    /// @notice Stop a stream and withdraw remaining balance
    /// @param streamId Stream to stop
    function stopStream(uint256 streamId) external nonReentrant {
        require(streamId < streams.length, "Stream not found");
        
        Stream storage stream = streams[streamId];
        require(stream.sender == msg.sender, "Not stream owner");
        require(stream.isActive, "Stream not active");
        
        // Claim any remaining claimable amount first
        uint256 claimable = getClaimableAmount(streamId);
        if (claimable > 0) {
            // Process claimable amount directly (avoid reentrancy)
            stream.lastClaimed = block.timestamp;
            stream.totalStreamed += claimable;
            streamBalances[streamId] -= claimable;
            
            // Process the claimed amount
            if (_isJarToken(stream.token)) {
                emit Deposit(stream.sender, stream.token, claimable);
            } else if (stream.autoSwap) {
                try this._swapIn(stream.token, claimable, stream.minOut, new address[](0)) returns (uint256 amountOut) {
                    emit DepositConverted(stream.sender, stream.token, claimable, _jarTokenAddress(), amountOut);
                } catch {
                    pendingTokens[stream.token] += claimable;
                    emit DepositPendingSwap(stream.sender, stream.token, claimable);
                }
            } else {
                pendingTokens[stream.token] += claimable;
                emit DepositPendingSwap(stream.sender, stream.token, claimable);
            }
            
            emit StreamClaimed(streamId, msg.sender, claimable, 0);
        }
        
        // Stop stream
        stream.isActive = false;
        hasActiveStream[stream.sender][stream.token] = false;
        
        // Refund remaining balance
        uint256 remainingBalance = streamBalances[streamId];
        if (remainingBalance > 0) {
            streamBalances[streamId] = 0;
            IERC20(stream.token).safeTransfer(stream.sender, remainingBalance);
        }
        
        emit StreamStopped(streamId, stream.sender, remainingBalance);
    }

    // === VIEW FUNCTIONS ===

    /// @notice Get claimable amount for a stream
    /// @param streamId Stream ID
    /// @return claimable Amount that can be claimed now
    function getClaimableAmount(uint256 streamId) public view returns (uint256 claimable) {
        if (streamId >= streams.length) return 0;
        
        Stream memory stream = streams[streamId];
        if (!stream.isActive) return 0;
        
        uint256 currentTime = block.timestamp;
        
        // Check if stream has ended
        if (stream.stopTime > 0 && currentTime > stream.stopTime) {
            currentTime = stream.stopTime;
        }
        
        // Calculate time elapsed since last claim
        uint256 timeElapsed = currentTime - stream.lastClaimed;
        
        // Calculate claimable amount
        uint256 theoreticalClaimable = timeElapsed * stream.ratePerSecond;
        
        // Limit to available stream balance
        uint256 availableBalance = streamBalances[streamId];
        claimable = theoreticalClaimable > availableBalance ? availableBalance : theoreticalClaimable;
    }

    /// @notice Get stream remaining time
    /// @param streamId Stream ID
    /// @return remainingTime Seconds until stream ends (0 = indefinite)
    function getStreamRemainingTime(uint256 streamId) external view returns (uint256 remainingTime) {
        if (streamId >= streams.length) return 0;
        
        Stream memory stream = streams[streamId];
        if (!stream.isActive || stream.stopTime == 0) return 0;
        
        if (block.timestamp >= stream.stopTime) return 0;
        return stream.stopTime - block.timestamp;
    }

    /// @notice Get all active streams for a sender
    /// @param sender Stream sender
    /// @return streamIds Array of active stream IDs
    function getActiveStreams(address sender) external view returns (uint256[] memory streamIds) {
        uint256 count = 0;
        
        // Count active streams
        for (uint256 i = 0; i < streams.length; i++) {
            if (streams[i].sender == sender && streams[i].isActive) {
                count++;
            }
        }
        
        // Build array
        streamIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < streams.length; i++) {
            if (streams[i].sender == sender && streams[i].isActive) {
                streamIds[index] = i;
                index++;
            }
        }
    }

    /// @notice Get total streams count
    /// @return Total number of streams created
    function getTotalStreams() external view returns (uint256) {
        return streams.length;
    }

    /// @notice Get stream by ID
    /// @param streamId Stream ID
    /// @return stream Stream data
    function getStream(uint256 streamId) external view returns (Stream memory stream) {
        require(streamId < streams.length, "Stream not found");
        return streams[streamId];
    }

    /// @notice Calculate total funding needed for a stream duration
    /// @param ratePerSecond Stream rate per second
    /// @param duration Duration in seconds
    /// @return totalFunding Total tokens needed
    function calculateStreamFunding(uint256 ratePerSecond, uint256 duration) external pure returns (uint256 totalFunding) {
        return ratePerSecond * duration;
    }

    /// @notice Get streaming statistics for a sender
    /// @param sender Address to check
    /// @return activeStreams Number of active streams
    /// @return totalValueLocked Total value in all streams
    /// @return totalStreamRate Combined rate across all streams
    function getSenderStreamStats(address sender) external view returns (
        uint256 activeStreams,
        uint256 totalValueLocked,
        uint256 totalStreamRate
    ) {
        for (uint256 i = 0; i < streams.length; i++) {
            Stream memory stream = streams[i];
            if (stream.sender == sender && stream.isActive) {
                activeStreams++;
                totalValueLocked += streamBalances[i];
                totalStreamRate += stream.ratePerSecond;
            }
        }
    }
}