// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    ISuperfluid,
    ISuperToken,
    IConstantFlowAgreementV1,
    ISuperAgreement
} from "@superfluid-finance/ethereum-contracts/interfaces/superfluid/ISuperfluid.sol";
import {CookieJarLib} from "./CookieJarLib.sol";

// ERC777 interface (needed for Superfluid compatibility)
interface IERC777 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title Streaming
/// @notice Library for Superfluid streaming functionality
library Streaming {
    /// @notice Real-time Super Token stream via Superfluid Protocol
    struct SuperfluidStream {
        address superToken;              // Super Token contract address
        address sender;                  // Stream sender
        int96 flowRate;                 // Real-time flow rate (wei/second)
        uint256 startTime;              // Stream start timestamp
        bool isActive;                  // Stream status
    }

    /// @notice Events
    event SuperStreamCreated(address indexed sender, address indexed superToken, int96 flowRate);
    event SuperStreamUpdated(address indexed sender, address indexed superToken, int96 newFlowRate);
    event SuperStreamDeleted(address indexed sender, address indexed superToken);

    /// @notice Create a Super Token stream
    /// @param superfluidHost The Superfluid host contract
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @param flowRate Flow rate (wad per second)
    /// @param superStreams Storage mapping for streams
    /// @param superTokenFlowRates Storage mapping for flow rates
    function createStream(
        ISuperfluid superfluidHost,
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address sender,
        int96 flowRate,
        mapping(address => mapping(address => SuperfluidStream)) storage superStreams,
        mapping(address => int96) storage superTokenFlowRates
    ) external {
        if (flowRate <= 0) revert("InvalidStreamRate");

        ISuperToken token = ISuperToken(superToken);

        // Check if stream already exists
        (, int96 existingFlowRate,,) = cfa.getFlow(token, sender, address(this));
        if (existingFlowRate != 0) revert("StreamAlreadyExists");

        // Create the actual Superfluid stream
        superfluidHost.callAgreement(
            ISuperAgreement(address(cfa)),
            abi.encodeCall(
                cfa.createFlow,
                (
                    token,
                    address(this), // receiver is this contract
                    flowRate,
                    new bytes(0) // placeholder
                )
            ),
            new bytes(0) // userData
        );

        // Update local tracking
        superStreams[superToken][sender] = SuperfluidStream({
            superToken: superToken,
            sender: sender,
            flowRate: flowRate,
            startTime: block.timestamp,
            isActive: true
        });

        // Update flow rate tracking
        superTokenFlowRates[superToken] += flowRate;

        emit SuperStreamCreated(sender, superToken, flowRate);
    }

    /// @notice Update a Super Token stream
    /// @param superfluidHost The Superfluid host contract
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @param newFlowRate New flow rate
    /// @param superStreams Storage mapping for streams
    /// @param superTokenFlowRates Storage mapping for flow rates
    function updateStream(
        ISuperfluid superfluidHost,
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address sender,
        int96 newFlowRate,
        mapping(address => mapping(address => SuperfluidStream)) storage superStreams,
        mapping(address => int96) storage superTokenFlowRates
    ) external {
        SuperfluidStream storage stream = superStreams[superToken][sender];
        if (stream.sender == address(0)) revert("StreamNotFound");

        ISuperToken token = ISuperToken(superToken);
        int96 oldFlowRate = stream.flowRate;

        // Update the actual Superfluid stream
        superfluidHost.callAgreement(
            ISuperAgreement(address(cfa)),
            abi.encodeCall(
                cfa.updateFlow,
                (
                    token,
                    address(this), // receiver is this contract
                    newFlowRate,
                    new bytes(0) // placeholder
                )
            ),
            new bytes(0) // userData
        );

        // Update local tracking
        stream.flowRate = newFlowRate;

        // Update flow rate tracking
        superTokenFlowRates[superToken] = superTokenFlowRates[superToken] - oldFlowRate + newFlowRate;

        emit SuperStreamUpdated(sender, superToken, newFlowRate);
    }

    /// @notice Delete a Super Token stream
    /// @param superfluidHost The Superfluid host contract
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @param superStreams Storage mapping for streams
    /// @param superTokenFlowRates Storage mapping for flow rates
    function deleteStream(
        ISuperfluid superfluidHost,
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address sender,
        mapping(address => mapping(address => SuperfluidStream)) storage superStreams,
        mapping(address => int96) storage superTokenFlowRates
    ) external {
        SuperfluidStream storage stream = superStreams[superToken][sender];
        if (stream.sender == address(0)) revert("StreamNotFound");

        ISuperToken token = ISuperToken(superToken);
        int96 oldFlowRate = stream.flowRate;

        // Delete the actual Superfluid stream
        superfluidHost.callAgreement(
            ISuperAgreement(address(cfa)),
            abi.encodeCall(
                cfa.deleteFlow,
                (
                    token,
                    sender,
                    address(this),
                    new bytes(0) // placeholder
                )
            ),
            new bytes(0) // userData
        );

        // Update local tracking
        stream.isActive = false;

        // Update flow rate tracking
        superTokenFlowRates[superToken] -= oldFlowRate;

        emit SuperStreamDeleted(sender, superToken);
    }

    /// @notice Get super stream details
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @param superStreams Storage mapping for streams
    /// @return stream Stream details
    function getStream(
        address superToken,
        address sender,
        mapping(address => mapping(address => SuperfluidStream)) storage superStreams
    ) external view returns (SuperfluidStream memory stream) {
        return superStreams[superToken][sender];
    }

    /// @notice Initialize Superfluid contracts
    /// @param superfluidHostAddress Address of the Superfluid host contract
    /// @return superfluidHost The initialized Superfluid host
    /// @return cfa The Constant Flow Agreement contract
    function initializeSuperfluidContracts(
        address superfluidHostAddress
    ) external view returns (ISuperfluid superfluidHost, IConstantFlowAgreementV1 cfa) {
        if (superfluidHostAddress == address(0)) revert CookieJarLib.ZeroAddress();

        superfluidHost = ISuperfluid(superfluidHostAddress);
        cfa = IConstantFlowAgreementV1(
            address(superfluidHost.getAgreementClass(
                keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")
            ))
        );
    }

    /// @notice Get detailed flow information for a specific stream
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @param receiver Stream receiver
    /// @return lastUpdated Timestamp of last update
    /// @return flowrate Current flowrate
    /// @return deposit Deposit amount
    /// @return owedDeposit Owed deposit amount
    function getSuperStreamInfo(
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address sender,
        address receiver
    ) external view returns (
        uint256 lastUpdated,
        int96 flowrate,
        uint256 deposit,
        uint256 owedDeposit
    ) {
        ISuperToken token = ISuperToken(superToken);
        return cfa.getFlow(token, sender, receiver);
    }

    /// @notice Get net flow rate for an account
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param account Account to check
    /// @return netFlowRate Net flow rate (positive = inflow, negative = outflow)
    function getNetFlowRate(
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address account
    ) external view returns (int96 netFlowRate) {
        ISuperToken token = ISuperToken(superToken);
        return cfa.getNetFlow(token, account);
    }

    /// @notice Get account flow info
    /// @param cfa The Constant Flow Agreement contract
    /// @param superToken Super Token address
    /// @param account Account to check
    /// @return lastUpdated Last update timestamp
    /// @return flowrate Net flowrate
    /// @return deposit Total deposit
    /// @return owedDeposit Owed deposit
    function getAccountFlowInfo(
        IConstantFlowAgreementV1 cfa,
        address superToken,
        address account
    ) external view returns (
        uint256 lastUpdated,
        int96 flowrate,
        uint256 deposit,
        uint256 owedDeposit
    ) {
        ISuperToken token = ISuperToken(superToken);
        return cfa.getAccountFlowInfo(token, account);
    }
}
