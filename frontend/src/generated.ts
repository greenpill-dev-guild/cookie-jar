import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from "wagmi/codegen";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CookieJar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cookieJarAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_jarOwner", type: "address", internalType: "address" },
      {
        name: "_supportedCurrency",
        type: "address",
        internalType: "address",
      },
      {
        name: "_accessType",
        type: "uint8",
        internalType: "enum CookieJarLib.AccessType",
      },
      {
        name: "_nftAddresses",
        type: "address[]",
        internalType: "address[]",
      },
      { name: "_nftTypes", type: "uint8[]", internalType: "uint8[]" },
      {
        name: "_withdrawalOption",
        type: "uint8",
        internalType: "enum CookieJarLib.WithdrawalTypeOptions",
      },
      {
        name: "_fixedAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_maxWithdrawal",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_withdrawalInterval",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_minETHDeposit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_minERC20Deposit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_feePercentageOnDeposit",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "_strictPurpose", type: "bool", internalType: "bool" },
      {
        name: "_defaultFeeCollector",
        type: "address",
        internalType: "address",
      },
      {
        name: "_emergencyWithdrawalEnabled",
        type: "bool",
        internalType: "bool",
      },
      { name: "_oneTimeWithdrawal", type: "bool", internalType: "bool" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "fallback", stateMutability: "payable" },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "accessType",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum CookieJarLib.AccessType",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addNFTGate",
    inputs: [
      { name: "_nftAddress", type: "address", internalType: "address" },
      { name: "_nftType", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "currency",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currencyHeldByJar",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "depositCurrency",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositETH",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "emergencyWithdrawCurrencyWithState",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emergencyWithdrawWithoutState",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emergencyWithdrawalEnabled",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feePercentageOnDeposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fixedAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNFTGatesArray",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct CookieJarLib.NFTGate[]",
        components: [
          {
            name: "nftAddress",
            type: "address",
            internalType: "address",
          },
          {
            name: "nftType",
            type: "uint8",
            internalType: "enum CookieJarLib.NFTType",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWithdrawalDataArray",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct CookieJarLib.WithdrawalData[]",
        components: [
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "purpose", type: "string", internalType: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantJarBlacklistRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantJarWhitelistRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isWithdrawnByUser",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "jarOwner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastWithdrawalNFT",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastWithdrawalWhitelist",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxWithdrawal",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minERC20Deposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minETHDeposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nftGates",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "nftAddress", type: "address", internalType: "address" },
      {
        name: "nftType",
        type: "uint8",
        internalType: "enum CookieJarLib.NFTType",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "oneTimeWithdrawal",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "removeNFTGate",
    inputs: [{ name: "_nftAddress", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeJarBlacklistRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeJarWhitelistRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "strictPurpose",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferJarOwnership",
    inputs: [{ name: "_newAdmin", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateFeeCollector",
    inputs: [
      {
        name: "_newFeeCollector",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawNFTMode",
    inputs: [
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "purpose", type: "string", internalType: "string" },
      { name: "gateAddress", type: "address", internalType: "address" },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawWhitelistMode",
    inputs: [
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "purpose", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawalData",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "purpose", type: "string", internalType: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawalInterval",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawalOption",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum CookieJarLib.WithdrawalTypeOptions",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AdminUpdated",
    inputs: [
      {
        name: "newAdmin",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BlacklistUpdated",
    inputs: [
      {
        name: "users",
        type: "address[]",
        indexed: false,
        internalType: "address[]",
      },
      {
        name: "statuses",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EmergencyWithdrawal",
    inputs: [
      {
        name: "admin",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeCollectorUpdated",
    inputs: [
      {
        name: "oldFeeCollector",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newFeeCollector",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NFTGateAdded",
    inputs: [
      {
        name: "nftAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "nftType",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NFTGateRemoved",
    inputs: [
      {
        name: "nftAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WhitelistUpdated",
    inputs: [
      {
        name: "users",
        type: "address[]",
        indexed: false,
        internalType: "address[]",
      },
      {
        name: "statuses",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "purpose",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AccessControlBadConfirmation", inputs: [] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "neededRole", type: "bytes32", internalType: "bytes32" },
    ],
  },
  { type: "error", name: "AdminCannotBeZeroAddress", inputs: [] },
  { type: "error", name: "Blacklisted", inputs: [] },
  { type: "error", name: "CookieJar__CurrencyNotApproved", inputs: [] },
  {
    type: "error",
    name: "CookieJar__WithdrawalAlreadyDone",
    inputs: [],
  },
  { type: "error", name: "DuplicateNFTGate", inputs: [] },
  { type: "error", name: "EmergencyWithdrawalDisabled", inputs: [] },
  { type: "error", name: "FeeTransferFailed", inputs: [] },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "InvalidAccessType", inputs: [] },
  { type: "error", name: "InvalidNFTGate", inputs: [] },
  { type: "error", name: "InvalidNFTType", inputs: [] },
  { type: "error", name: "InvalidPurpose", inputs: [] },
  { type: "error", name: "InvalidTokenAddress", inputs: [] },
  { type: "error", name: "LessThanMinimumDeposit", inputs: [] },
  { type: "error", name: "MaxNFTGatesReached", inputs: [] },
  { type: "error", name: "NFTArrayLengthMismatch", inputs: [] },
  { type: "error", name: "NFTGateNotFound", inputs: [] },
  { type: "error", name: "NoNFTAddressesProvided", inputs: [] },
  { type: "error", name: "NotAdmin", inputs: [] },
  { type: "error", name: "NotAuthorized", inputs: [] },
  { type: "error", name: "NotFeeCollector", inputs: [] },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "WithdrawalAmountNotAllowed",
    inputs: [
      { name: "requested", type: "uint256", internalType: "uint256" },
      { name: "allowed", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "WithdrawalTooSoon",
    inputs: [{ name: "nextAllowed", type: "uint256", internalType: "uint256" }],
  },
  { type: "error", name: "ZeroWithdrawal", inputs: [] },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CookieJarFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cookieJarFactoryAddress =
  "0x5fE4fF0d6cdF621888F7B1db62460b9876229c0d";
export const cookieJarRegistryAddress =
  "0xDB06e99f0e5Ed8C412c582516D38D2fAdC07eD3C";

export const cookieJarFactoryAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_defaultFeeCollector",
        type: "address",
        internalType: "address",
      },
      { name: "_registry", type: "address", internalType: "address" },
      { name: "_owner", type: "address", internalType: "address" },
      {
        name: "_feePercentage",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_minETHDeposit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_minERC20Deposit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "BLACKLISTED_JAR_CREATORS",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OWNER",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PROTOCOL_ADMIN",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createCookieJar",
    inputs: [
      {
        name: "_cookieJarOwner",
        type: "address",
        internalType: "address",
      },
      {
        name: "_supportedCurrency",
        type: "address",
        internalType: "address",
      },
      {
        name: "_accessType",
        type: "uint8",
        internalType: "enum CookieJarLib.AccessType",
      },
      {
        name: "_nftAddresses",
        type: "address[]",
        internalType: "address[]",
      },
      { name: "_nftTypes", type: "uint8[]", internalType: "uint8[]" },
      {
        name: "_withdrawalOption",
        type: "uint8",
        internalType: "enum CookieJarLib.WithdrawalTypeOptions",
      },
      {
        name: "_fixedAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_maxWithdrawal",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_withdrawalInterval",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "_strictPurpose", type: "bool", internalType: "bool" },
      {
        name: "_emergencyWithdrawalEnabled",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "_oneTimeWithdrawal",
        type: "bool",
        internalType: "bool",
      },
      { name: "metadata", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "defaultFeeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultFeePercentage",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantBlacklistedJarCreatorsRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantProtocolAdminRole",
    inputs: [{ name: "_admin", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minERC20Deposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minETHDeposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registry",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract CookieJarRegistry",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeBlacklistedJarCreatorsRole",
    inputs: [{ name: "_users", type: "address[]", internalType: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeProtocolAdminRole",
    inputs: [{ name: "_admin", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "_newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BlacklistRoleGranted",
    inputs: [
      {
        name: "users",
        type: "address[]",
        indexed: false,
        internalType: "address[]",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CookieJarCreated",
    inputs: [
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "cookieJarAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "metadata",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ProtocolAdminUpdated",
    inputs: [
      {
        name: "previous",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "current",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AccessControlBadConfirmation", inputs: [] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "neededRole", type: "bytes32", internalType: "bytes32" },
    ],
  },
  { type: "error", name: "CookieJarFactory__Blacklisted", inputs: [] },
  {
    type: "error",
    name: "CookieJarFactory__LessThanMinimumDeposit",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__MismatchedArrayLengths",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__NotAuthorized",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__NotFeeCollector",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__NotSufficientAllowance",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__NotValidERC20",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__TransferFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__UserIsNotBlacklisted",
    inputs: [],
  },
  {
    type: "error",
    name: "CookieJarFactory__WithdrawingMoreThanDeposited",
    inputs: [],
  },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CookieJarRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cookieJarRegistryAbi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "CookieJarRegistry__FactoryAlreadySet", type: "error" },
  { inputs: [], name: "CookieJarRegistry__NotOwner", type: "error" },
  { inputs: [], name: "CookieJarRegistry__NotValidJarAddress", type: "error" },
  { inputs: [], name: "CookieJarRegistry__OnlyFactoryCanCall", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "factory",
        type: "address",
      },
    ],
    name: "CookieJarFactorySet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract CookieJar",
        name: "jarInstance",
        type: "address",
      },
    ],
    name: "CookieJarRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "status", type: "bool" },
    ],
    name: "GlobalBlacklistUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "status", type: "bool" },
    ],
    name: "GlobalWhitelistUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "cookieJarFactory",
    outputs: [
      { internalType: "contract CookieJarFactory", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllJars",
    outputs: [
      {
        components: [
          { internalType: "address", name: "jarAddress", type: "address" },
          { internalType: "address", name: "currency", type: "address" },
          { internalType: "address", name: "jarCreator", type: "address" },
          { internalType: "string", name: "metadata", type: "string" },
          {
            internalType: "uint256",
            name: "registrationTime",
            type: "uint256",
          },
          {
            internalType: "enum CookieJarLib.AccessType",
            name: "accessType",
            type: "uint8",
          },
          {
            components: [
              { internalType: "address", name: "nftAddress", type: "address" },
              {
                internalType: "enum CookieJarLib.NFTType",
                name: "nftType",
                type: "uint8",
              },
            ],
            internalType: "struct CookieJarLib.NFTGate[]",
            name: "nftGates",
            type: "tuple[]",
          },
          {
            internalType: "enum CookieJarLib.WithdrawalTypeOptions",
            name: "withdrawalOption",
            type: "uint8",
          },
          { internalType: "uint256", name: "fixedAmount", type: "uint256" },
          { internalType: "uint256", name: "maxWithdrawal", type: "uint256" },
          {
            internalType: "uint256",
            name: "withdrawalInterval",
            type: "uint256",
          },
          { internalType: "bool", name: "strictPurpose", type: "bool" },
          {
            internalType: "bool",
            name: "emergencyWithdrawalEnabled",
            type: "bool",
          },
        ],
        internalType: "struct CookieJarRegistry.CookieJarInfo[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_jarCreator", type: "address" }],
    name: "getJarByCreatorAddress",
    outputs: [
      {
        components: [
          { internalType: "address", name: "jarAddress", type: "address" },
          { internalType: "address", name: "currency", type: "address" },
          { internalType: "address", name: "jarCreator", type: "address" },
          { internalType: "string", name: "metadata", type: "string" },
          {
            internalType: "uint256",
            name: "registrationTime",
            type: "uint256",
          },
          {
            internalType: "enum CookieJarLib.AccessType",
            name: "accessType",
            type: "uint8",
          },
          {
            components: [
              { internalType: "address", name: "nftAddress", type: "address" },
              {
                internalType: "enum CookieJarLib.NFTType",
                name: "nftType",
                type: "uint8",
              },
            ],
            internalType: "struct CookieJarLib.NFTGate[]",
            name: "nftGates",
            type: "tuple[]",
          },
          {
            internalType: "enum CookieJarLib.WithdrawalTypeOptions",
            name: "withdrawalOption",
            type: "uint8",
          },
          { internalType: "uint256", name: "fixedAmount", type: "uint256" },
          { internalType: "uint256", name: "maxWithdrawal", type: "uint256" },
          {
            internalType: "uint256",
            name: "withdrawalInterval",
            type: "uint256",
          },
          { internalType: "bool", name: "strictPurpose", type: "bool" },
          {
            internalType: "bool",
            name: "emergencyWithdrawalEnabled",
            type: "bool",
          },
        ],
        internalType: "struct CookieJarRegistry.CookieJarInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRegisteredCookieJarsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "jarCreatorToJar",
    outputs: [
      { internalType: "address", name: "jarAddress", type: "address" },
      { internalType: "address", name: "currency", type: "address" },
      { internalType: "address", name: "jarCreator", type: "address" },
      { internalType: "string", name: "metadata", type: "string" },
      { internalType: "uint256", name: "registrationTime", type: "uint256" },
      {
        internalType: "enum CookieJarLib.AccessType",
        name: "accessType",
        type: "uint8",
      },
      {
        internalType: "enum CookieJarLib.WithdrawalTypeOptions",
        name: "withdrawalOption",
        type: "uint8",
      },
      { internalType: "uint256", name: "fixedAmount", type: "uint256" },
      { internalType: "uint256", name: "maxWithdrawal", type: "uint256" },
      { internalType: "uint256", name: "withdrawalInterval", type: "uint256" },
      { internalType: "bool", name: "strictPurpose", type: "bool" },
      {
        internalType: "bool",
        name: "emergencyWithdrawalEnabled",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract CookieJar",
        name: "_jarInstance",
        type: "address",
      },
      { internalType: "string", name: "_metadata", type: "string" },
    ],
    name: "registerAndStoreCookieJar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "registeredCookieJars",
    outputs: [
      { internalType: "address", name: "jarAddress", type: "address" },
      { internalType: "address", name: "currency", type: "address" },
      { internalType: "address", name: "jarCreator", type: "address" },
      { internalType: "string", name: "metadata", type: "string" },
      { internalType: "uint256", name: "registrationTime", type: "uint256" },
      {
        internalType: "enum CookieJarLib.AccessType",
        name: "accessType",
        type: "uint8",
      },
      {
        internalType: "enum CookieJarLib.WithdrawalTypeOptions",
        name: "withdrawalOption",
        type: "uint8",
      },
      { internalType: "uint256", name: "fixedAmount", type: "uint256" },
      { internalType: "uint256", name: "maxWithdrawal", type: "uint256" },
      { internalType: "uint256", name: "withdrawalInterval", type: "uint256" },
      { internalType: "bool", name: "strictPurpose", type: "bool" },
      {
        internalType: "bool",
        name: "emergencyWithdrawalEnabled",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_factory", type: "address" }],
    name: "setCookieJarFactory",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useReadCookieJar = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
});

export const useReadCookieJarGetCurrency = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "currency",
});

export const useReadCookieJarGetPastWithdrawals =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "getWithdrawalDataArray",
  });

export const useReadCookieJarGetCurrencyHeldByJar =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "currencyHeldByJar",
  });

export const useReadCookieJarOwner = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "jarOwner",
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"accessType"`
 */
export const useReadCookieJarAccessType = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "accessType",
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"emergencyWithdrawalEnabled"`
 */
export const useReadCookieJarEmergencyWithdrawalEnabled =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "emergencyWithdrawalEnabled",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"feeCollector"`
 */
export const useReadCookieJarFeeCollector = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarAbi, functionName: "feeCollector" }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"fixedAmount"`
 */
export const useReadCookieJarFixedAmount = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "fixedAmount",
});

export const useReadCookieJarOneTimeWithdrawal =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "oneTimeWithdrawal",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"lastWithdrawalNFT"`
 */
export const useReadCookieJarLastWithdrawalNft =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "lastWithdrawalNFT",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"lastWithdrawalWhitelist"`
 */
export const useReadCookieJarLastWithdrawalWhitelist =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "lastWithdrawalWhitelist",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"maxWithdrawal"`
 */
export const useReadCookieJarMaxWithdrawal =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "maxWithdrawal",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"nftGates"`
 */
export const useReadCookieJarNftGates = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "nftGates",
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"strictPurpose"`
 */
export const useReadCookieJarStrictPurpose =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "strictPurpose",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawalInterval"`
 */
export const useReadCookieJarWithdrawalInterval =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "withdrawalInterval",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawalOption"`
 */
export const useReadCookieJarWithdrawalOption =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: "withdrawalOption",
  });

export const useReadCookieJarHasRole = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: "hasRole",
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useWriteCookieJar = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"addNFTGate"`
 */
export const useWriteCookieJarAddNftGate = /*#__PURE__*/ createUseWriteContract(
  { abi: cookieJarAbi, functionName: "addNFTGate" }
);

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"emergencyWithdraw"`
 */
export const useWriteCookieJarEmergencyWithdrawWithoutState =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "emergencyWithdrawWithoutState",
  });

export const useWriteCookieJarEmergencyWithdrawCurrencyWithState =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "emergencyWithdrawCurrencyWithState",
  });

export const useWriteCookieJarDepositETH = /*#__PURE__*/ createUseWriteContract(
  {
    abi: cookieJarAbi,
    functionName: "depositETH",
  }
);

export const useWriteCookieJarDepositCurrency =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "depositCurrency",
  });
/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"removeNFTGate"`
 */
export const useWriteCookieJarRemoveNftGate =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "removeNFTGate",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateAdmin"`
 */
export const useWriteCookieJarTransferJarOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "transferJarOwnership",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateBlacklist"`
 */
export const useWriteCookieJarGrantJarBlacklistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "grantJarBlacklistRole",
  });

export const useWriteCookieJarRevokeJarBlacklistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "revokeJarBlacklistRole",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFeeCollector"`
 */
export const useWriteCookieJarUpdateFeeCollector =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "updateFeeCollector",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateWhitelist"`
 */
export const useWriteCookieJarGrantJarWhitelistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "grantJarWhitelistRole",
  });

export const useWriteCookieJarRevokeJarWhitelistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "revokeJarWhitelistRole",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawNFTMode"`
 */
export const useWriteCookieJarWithdrawNftMode =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "withdrawNFTMode",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWhitelistMode"`
 */
export const useWriteCookieJarWithdrawWhitelistMode =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: "withdrawWhitelistMode",
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useSimulateCookieJar = /*#__PURE__*/ createUseSimulateContract({
  abi: cookieJarAbi,
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"addNFTGate"`
 */
export const useSimulateCookieJarAddNftGate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "addNFTGate",
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"deposit"`
 */
export const useSimulateCookieJarDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "depositETH",
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"depositToken"`
 */
export const useSimulateCookieJarDepositToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "depositCurrency",
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"removeNFTGate"`
 */
export const useSimulateCookieJarRemoveNftGate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "removeNFTGate",
  });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateBlacklist"`
//  */
// export const useSimulateCookieJarUpdateBlacklist =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarAbi,
//     functionName: "updateBlacklist",
//   });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFeeCollector"`
 */
export const useSimulateCookieJarUpdateFeeCollector =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "updateFeeCollector",
  });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateWhitelist"`
//  */
// export const useSimulateCookieJarUpdateWhitelist =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarAbi,
//     functionName: "updateWhitelist",
//   });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawNFTMode"`
 */
export const useSimulateCookieJarWithdrawNftMode =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "withdrawNFTMode",
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWhitelistMode"`
 */
export const useSimulateCookieJarWithdrawWhitelistMode =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: "withdrawWhitelistMode",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useWatchCookieJarEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: cookieJarAbi }
);

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"AdminUpdated"`
 */
export const useWatchCookieJarAdminUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "AdminUpdated",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"BlacklistUpdated"`
 */
export const useWatchCookieJarBlacklistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "BlacklistUpdated",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"Deposit"`
 */
export const useWatchCookieJarDepositEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "Deposit",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"EmergencyWithdrawal"`
 */
export const useWatchCookieJarEmergencyWithdrawalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "EmergencyWithdrawal",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"FeeCollectorUpdated"`
 */
export const useWatchCookieJarFeeCollectorUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "FeeCollectorUpdated",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"NFTGateAdded"`
 */
export const useWatchCookieJarNftGateAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "NFTGateAdded",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"NFTGateRemoved"`
 */
export const useWatchCookieJarNftGateRemovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "NFTGateRemoved",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"WhitelistUpdated"`
 */
export const useWatchCookieJarWhitelistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "WhitelistUpdated",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"Withdrawal"`
 */
export const useWatchCookieJarWithdrawalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: "Withdrawal",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__
 */
export const useReadCookieJarFactory = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarFactoryAbi,
});

// /**
//  * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"admin"`
//  */
// export const useReadCookieJarFactoryAdmin = /*#__PURE__*/ createUseReadContract(
//   { abi: cookieJarFactoryAbi, functionName: "" }
// );

// /**
//  * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"cookieJarMetadata"`
//  */
// export const useReadCookieJarFactoryCookieJarMetadata =
//   /*#__PURE__*/ createUseReadContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "cookieJarMetadata",
//   });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"cookieJars"`
 */
export const useReadCookieJarRegistryCookieJars =
  /*#__PURE__*/ createUseReadContract({
    address: cookieJarRegistryAddress,
    abi: cookieJarRegistryAbi,
    functionName: "getAllJars",
  });

// /**
//  * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"defaultFee"`
//  */
// export const useReadCookieJarFactoryDefaultFee =
//   /*#__PURE__*/ createUseReadContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "defaultFee",
//   });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"defaultFeeCollector"`
 */
export const useReadCookieJarFactoryDefaultFeeCollector =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: "defaultFeeCollector",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"registry"`
 */
export const useReadCookieJarFactoryRegistry =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: "registry",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__
 */
export const useWriteCookieJarFactory = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarFactoryAbi,
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"createCookieJar"`
 */
export const useWriteCookieJarFactoryCreateCookieJar =
  /*#__PURE__*/ createUseWriteContract({
    address: cookieJarFactoryAddress,
    abi: cookieJarFactoryAbi,
    functionName: "createCookieJar",
  });

// /**
//  * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateAdmin"`
//  */
// export const useWriteCookieJarFactoryUpdateAdmin =
//   /*#__PURE__*/ createUseWriteContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "updateAdmin",
//   });

// /**
//  * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateGlobalBlacklist"`
//  */
// export const useWriteCookieJarFactoryUpdateGlobalBlacklist =
//   /*#__PURE__*/ createUseWriteContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "updateGlobalBlacklist",
//   });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__
 */
export const useSimulateCookieJarFactory =
  /*#__PURE__*/ createUseSimulateContract({ abi: cookieJarFactoryAbi });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"createCookieJar"`
 */
export const useSimulateCookieJarFactoryCreateCookieJar =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarFactoryAbi,
    functionName: "createCookieJar",
  });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateAdmin"`
//  */
// export const useSimulateCookieJarFactoryUpdateAdmin =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "updateAdmin",
//   });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateGlobalBlacklist"`
//  */
// export const useSimulateCookieJarFactoryUpdateGlobalBlacklist =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarFactoryAbi,
//     functionName: "updateGlobalBlacklist",
//   });

// /**
//  * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__
//  */
// export const useWatchCookieJarFactoryEvent =
//   /*#__PURE__*/ createUseWatchContractEvent({ abi: cookieJarFactoryAbi });

// /**
//  * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"AdminUpdated"`
//  */
// export const useWatchCookieJarFactoryAdminUpdatedEvent =
//   /*#__PURE__*/ createUseWatchContractEvent({
//     abi: cookieJarFactoryAbi,
//     eventName: "AdminUpdated",
//   });

// /**
//  * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"CookieJarCreated"`
//  */
// export const useWatchCookieJarFactoryCookieJarCreatedEvent =
//   /*#__PURE__*/ createUseWatchContractEvent({
//     abi: cookieJarFactoryAbi,
//     eventName: "CookieJarCreated",
//   });

// /**
//  * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"GlobalBlacklistUpdated"`
//  */
// export const useWatchCookieJarFactoryGlobalBlacklistUpdatedEvent =
//   /*#__PURE__*/ createUseWatchContractEvent({
//     abi: cookieJarFactoryAbi,
//     eventName: "GlobalBlacklistUpdated",
//   });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__
 */
export const useReadCookieJarRegistry = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarRegistryAbi,
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"cookieJarFactory"`
 */
export const useReadCookieJarRegistryCookieJarFactory =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarRegistryAbi,
    functionName: "cookieJarFactory",
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"getRegisteredCookieJarsCount"`
 */
export const useReadCookieJarRegistryGetRegisteredCookieJarsCount =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarRegistryAbi,
    functionName: "getRegisteredCookieJarsCount",
  });

// /**
//  * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"globalBlacklist"`
//  */
// export const useReadCookieJarRegistryGlobalBlacklist =
//   /*#__PURE__*/ createUseReadContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "globalBlacklist",
//   });

// /**
//  * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"globalWhitelist"`
//  */
// export const useReadCookieJarRegistryGlobalWhitelist =
//   /*#__PURE__*/ createUseReadContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "globalWhitelist",
//   });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"registeredCookieJars"`
 */
export const useReadCookieJarRegistryRegisteredCookieJars =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarRegistryAbi,
    functionName: "registeredCookieJars",
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__
 */
export const useWriteCookieJarRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarRegistryAbi,
});

// /**
//  * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"registerCookieJar"`
//  */
// export const useWriteCookieJarRegistryRegisterCookieJar =
//   /*#__PURE__*/ createUseWriteContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "registerCookieJar",
//   });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"setCookieJarFactory"`
 */
export const useWriteCookieJarRegistrySetCookieJarFactory =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarRegistryAbi,
    functionName: "setCookieJarFactory",
  });

// /**
//  * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"updateGlobalBlacklist"`
//  */
// export const useWriteCookieJarRegistryUpdateGlobalBlacklist =
//   /*#__PURE__*/ createUseWriteContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "updateGlobalBlacklist",
//   });

// /**
//  * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"updateGlobalWhitelist"`
//  */
// export const useWriteCookieJarRegistryUpdateGlobalWhitelist =
//   /*#__PURE__*/ createUseWriteContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "updateGlobalWhitelist",
//   });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__
//  */
// export const useSimulateCookieJarRegistry =
//   /*#__PURE__*/ createUseSimulateContract({ abi: cookieJarRegistryAbi });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"registerCookieJar"`
//  */
// export const useSimulateCookieJarRegistryRegisterCookieJar =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "registerCookieJar",
//   });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"setCookieJarFactory"`
 */
export const useSimulateCookieJarRegistrySetCookieJarFactory =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarRegistryAbi,
    functionName: "setCookieJarFactory",
  });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"updateGlobalBlacklist"`
//  */
// export const useSimulateCookieJarRegistryUpdateGlobalBlacklist =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "updateGlobalBlacklist",
//   });

// /**
//  * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `functionName` set to `"updateGlobalWhitelist"`
//  */
// export const useSimulateCookieJarRegistryUpdateGlobalWhitelist =
//   /*#__PURE__*/ createUseSimulateContract({
//     abi: cookieJarRegistryAbi,
//     functionName: "updateGlobalWhitelist",
//   });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarRegistryAbi}__
 */
export const useWatchCookieJarRegistryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: cookieJarRegistryAbi });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `eventName` set to `"CookieJarFactorySet"`
 */
export const useWatchCookieJarRegistryCookieJarFactorySetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarRegistryAbi,
    eventName: "CookieJarFactorySet",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `eventName` set to `"CookieJarRegistered"`
 */
export const useWatchCookieJarRegistryCookieJarRegisteredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarRegistryAbi,
    eventName: "CookieJarRegistered",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `eventName` set to `"GlobalBlacklistUpdated"`
 */
export const useWatchCookieJarRegistryGlobalBlacklistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarRegistryAbi,
    eventName: "GlobalBlacklistUpdated",
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarRegistryAbi}__ and `eventName` set to `"GlobalWhitelistUpdated"`
 */
export const useWatchCookieJarRegistryGlobalWhitelistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarRegistryAbi,
    eventName: "GlobalWhitelistUpdated",
  });
