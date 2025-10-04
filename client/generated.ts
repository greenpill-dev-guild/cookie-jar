import {
  createUseReadContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
  createUseWriteContract,
} from 'wagmi/codegen';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CookieJar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cookieJarAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'config',
        internalType: 'struct CookieJarLib.JarConfig',
        type: 'tuple',
        components: [
          { name: 'jarOwner', internalType: 'address', type: 'address' },
          {
            name: 'supportedCurrency',
            internalType: 'address',
            type: 'address',
          },
          { name: 'feeCollector', internalType: 'address', type: 'address' },
          {
            name: 'accessType',
            internalType: 'enum CookieJarLib.AccessType',
            type: 'uint8',
          },
          {
            name: 'withdrawalOption',
            internalType: 'enum CookieJarLib.WithdrawalTypeOptions',
            type: 'uint8',
          },
          { name: 'strictPurpose', internalType: 'bool', type: 'bool' },
          {
            name: 'emergencyWithdrawalEnabled',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'oneTimeWithdrawal', internalType: 'bool', type: 'bool' },
          { name: 'fixedAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'maxWithdrawal', internalType: 'uint256', type: 'uint256' },
          {
            name: 'withdrawalInterval',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'minDeposit', internalType: 'uint256', type: 'uint256' },
          {
            name: 'feePercentageOnDeposit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'maxWithdrawalPerPeriod',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'metadata', internalType: 'string', type: 'string' },
          {
            name: 'multiTokenConfig',
            internalType: 'struct CookieJarLib.MultiTokenConfig',
            type: 'tuple',
            components: [
              { name: 'enabled', internalType: 'bool', type: 'bool' },
              {
                name: 'maxSlippagePercent',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'minSwapAmount',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'defaultFee', internalType: 'uint24', type: 'uint24' },
            ],
          },
        ],
      },
      {
        name: 'accessConfig',
        internalType: 'struct CookieJarLib.AccessConfig',
        type: 'tuple',
        components: [
          { name: 'allowlist', internalType: 'address[]', type: 'address[]' },
          {
            name: 'nftRequirement',
            internalType: 'struct CookieJarLib.NftRequirement',
            type: 'tuple',
            components: [
              { name: 'nftContract', internalType: 'address', type: 'address' },
              { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
              { name: 'minBalance', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: '_superfluidHost', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'ACCESS_TYPE',
    outputs: [
      { name: '', internalType: 'enum CookieJarLib.AccessType', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CFA',
    outputs: [
      {
        name: '',
        internalType: 'contract IConstantFlowAgreementV1',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CURRENCY',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'EMERGENCY_WITHDRAWAL_ENABLED',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE_PERCENTAGE_ON_DEPOSIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_WITHDRAWAL_PER_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_DEPOSIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ONE_TIME_WITHDRAWAL',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'STRICT_PURPOSE',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SUPERFLUID_HOST',
    outputs: [
      { name: '', internalType: 'contract ISuperfluid', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WITHDRAWAL_OPTION',
    outputs: [
      {
        name: '',
        internalType: 'enum CookieJarLib.WithdrawalTypeOptions',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'allowlist',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'superToken', internalType: 'address', type: 'address' },
      { name: 'flowRate', internalType: 'int96', type: 'int96' },
    ],
    name: 'createSuperStream',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'currencyHeldByJar',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'superToken', internalType: 'address', type: 'address' }],
    name: 'deleteSuperStream',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeCollector',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'fixedAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'superToken', internalType: 'address', type: 'address' }],
    name: 'getAccountFlowInfo',
    outputs: [
      { name: 'lastUpdated', internalType: 'uint256', type: 'uint256' },
      { name: 'flowrate', internalType: 'int96', type: 'int96' },
      { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'owedDeposit', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllowlist',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'superToken', internalType: 'address', type: 'address' }],
    name: 'getNetFlowRate',
    outputs: [{ name: 'netFlowRate', internalType: 'int96', type: 'int96' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPendingTokenAddresses',
    outputs: [{ name: 'tokens', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'superToken', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
    ],
    name: 'getSuperStreamInfo',
    outputs: [
      { name: 'lastUpdated', internalType: 'uint256', type: 'uint256' },
      { name: 'flowrate', internalType: 'int96', type: 'int96' },
      { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'owedDeposit', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_users', internalType: 'address[]', type: 'address[]' }],
    name: 'grantJarAllowlistRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'lastWithdrawalTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxWithdrawal',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'multiTokenConfig',
    outputs: [
      { name: 'enabled', internalType: 'bool', type: 'bool' },
      { name: 'maxSlippagePercent', internalType: 'uint256', type: 'uint256' },
      { name: 'minSwapAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'defaultFee', internalType: 'uint24', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nftRequirement',
    outputs: [
      { name: 'nftContract', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'minBalance', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'pendingTokenBalances',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'callerConfirmation', internalType: 'address', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_users', internalType: 'address[]', type: 'address[]' }],
    name: 'revokeJarAllowlistRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'superStreams',
    outputs: [
      { name: 'superToken', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'flowRate', internalType: 'int96', type: 'int96' },
      { name: 'startTime', internalType: 'uint32', type: 'uint32' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'superTokenFlowRates',
    outputs: [{ name: '', internalType: 'int96', type: 'int96' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'minJarTokensOut', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapPendingTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'totalWithdrawn',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_newFeeCollector', internalType: 'address', type: 'address' },
    ],
    name: 'updateFeeCollector',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_fixedAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateFixedWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_maxWithdrawal', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateMaxWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'superToken', internalType: 'address', type: 'address' },
      { name: 'newFlowRate', internalType: 'int96', type: 'int96' },
    ],
    name: 'updateSuperStream',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_withdrawalInterval', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateWithdrawalInterval',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'purpose', internalType: 'string', type: 'string' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'purpose', internalType: 'string', type: 'string' },
    ],
    name: 'withdrawAllowlistMode',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'purpose', internalType: 'string', type: 'string' },
    ],
    name: 'withdrawWithErc1155',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'purpose', internalType: 'string', type: 'string' },
    ],
    name: 'withdrawWithErc721',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawalInterval',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'withdrawnInCurrentPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Deposit',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EmergencyWithdrawal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'feeCollector',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'FeeCollected',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldCollector',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newCollector',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'FeeCollectorUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paramName',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newValue',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ParameterUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'paused', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'PausedStateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PendingTokensRecovered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'RoleAdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'fromToken',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toToken',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amountIn',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amountOut',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TokenSwapped',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  { type: 'error', inputs: [], name: 'AccessControlBadConfirmation' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'neededRole', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'AdminCannotBeZeroAddress' },
  { type: 'error', inputs: [], name: 'EmergencyWithdrawalDisabled' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'FeeCollectorAddressCannotBeZeroAddress' },
  { type: 'error', inputs: [], name: 'FeeTransferFailed' },
  { type: 'error', inputs: [], name: 'InsufficientBalance' },
  {
    type: 'error',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'minAmountOut', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientOutput',
  },
  { type: 'error', inputs: [], name: 'InvalidAccessType' },
  { type: 'error', inputs: [], name: 'InvalidNFTGate' },
  { type: 'error', inputs: [], name: 'InvalidPurpose' },
  { type: 'error', inputs: [], name: 'InvalidTokenAddress' },
  { type: 'error', inputs: [], name: 'InvalidWithdrawalType' },
  { type: 'error', inputs: [], name: 'LessThanMinimumDeposit' },
  { type: 'error', inputs: [], name: 'NoNFTAddressesProvided' },
  { type: 'error', inputs: [], name: 'NotAuthorized' },
  { type: 'error', inputs: [], name: 'NotFeeCollector' },
  {
    type: 'error',
    inputs: [
      { name: 'requested', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PeriodWithdrawalLimitExceeded',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'error',
    inputs: [{ name: 'reason', internalType: 'string', type: 'string' }],
    name: 'SwapFailed',
  },
  { type: 'error', inputs: [], name: 'TransferFailed' },
  {
    type: 'error',
    inputs: [{ name: 'chainId', internalType: 'uint256', type: 'uint256' }],
    name: 'UnsupportedChain',
  },
  { type: 'error', inputs: [], name: 'WithdrawalAlreadyDone' },
  {
    type: 'error',
    inputs: [
      { name: 'requested', internalType: 'uint256', type: 'uint256' },
      { name: 'allowed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'WithdrawalAmountNotAllowed',
  },
  {
    type: 'error',
    inputs: [{ name: 'nextAllowed', internalType: 'uint256', type: 'uint256' }],
    name: 'WithdrawalTooSoon',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
  { type: 'error', inputs: [], name: 'ZeroAmount' },
  { type: 'error', inputs: [], name: 'ZeroAmount' },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CookieJarFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cookieJarFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_defaultFeeCollector',
        internalType: 'address',
        type: 'address',
      },
      { name: '_owner', internalType: 'address', type: 'address' },
      { name: '_feePercentage', internalType: 'uint256', type: 'uint256' },
      { name: '_minEthDeposit', internalType: 'uint128', type: 'uint128' },
      { name: '_minErc20Deposit', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_FEE_COLLECTOR',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_FEE_PERCENTAGE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_ERC20_DEPOSIT',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_ETH_DEPOSIT',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'OWNER',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'admins',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'cookieJars',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType: 'struct CookieJarLib.JarConfig',
        type: 'tuple',
        components: [
          { name: 'jarOwner', internalType: 'address', type: 'address' },
          {
            name: 'supportedCurrency',
            internalType: 'address',
            type: 'address',
          },
          { name: 'feeCollector', internalType: 'address', type: 'address' },
          {
            name: 'accessType',
            internalType: 'enum CookieJarLib.AccessType',
            type: 'uint8',
          },
          {
            name: 'withdrawalOption',
            internalType: 'enum CookieJarLib.WithdrawalTypeOptions',
            type: 'uint8',
          },
          { name: 'strictPurpose', internalType: 'bool', type: 'bool' },
          {
            name: 'emergencyWithdrawalEnabled',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'oneTimeWithdrawal', internalType: 'bool', type: 'bool' },
          { name: 'fixedAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'maxWithdrawal', internalType: 'uint256', type: 'uint256' },
          {
            name: 'withdrawalInterval',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'minDeposit', internalType: 'uint256', type: 'uint256' },
          {
            name: 'feePercentageOnDeposit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'maxWithdrawalPerPeriod',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'metadata', internalType: 'string', type: 'string' },
          {
            name: 'multiTokenConfig',
            internalType: 'struct CookieJarLib.MultiTokenConfig',
            type: 'tuple',
            components: [
              { name: 'enabled', internalType: 'bool', type: 'bool' },
              {
                name: 'maxSlippagePercent',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'minSwapAmount',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'defaultFee', internalType: 'uint24', type: 'uint24' },
            ],
          },
        ],
      },
      {
        name: 'accessConfig',
        internalType: 'struct CookieJarLib.AccessConfig',
        type: 'tuple',
        components: [
          { name: 'allowlist', internalType: 'address[]', type: 'address[]' },
          {
            name: 'nftRequirement',
            internalType: 'struct CookieJarLib.NftRequirement',
            type: 'tuple',
            components: [
              { name: 'nftContract', internalType: 'address', type: 'address' },
              { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
              { name: 'minBalance', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      {
        name: 'multiTokenConfig',
        internalType: 'struct CookieJarLib.MultiTokenConfig',
        type: 'tuple',
        components: [
          { name: 'enabled', internalType: 'bool', type: 'bool' },
          {
            name: 'maxSlippagePercent',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'minSwapAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'defaultFee', internalType: 'uint24', type: 'uint24' },
        ],
      },
    ],
    name: 'createCookieJar',
    outputs: [{ name: 'jarAddress', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllJars',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getJarCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'jarAddress', internalType: 'address', type: 'address' }],
    name: 'getJarInfo',
    outputs: [
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'metadata', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'jarAddress', internalType: 'address', type: 'address' }],
    name: 'getMetadata',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'jarInfo',
    outputs: [
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'createdAt', internalType: 'uint64', type: 'uint64' },
      { name: 'exists', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'admin', internalType: 'address', type: 'address' },
      { name: 'granted', internalType: 'bool', type: 'bool' },
    ],
    name: 'setAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'jarAddress', internalType: 'address', type: 'address' },
      { name: 'newMetadata', internalType: 'string', type: 'string' },
    ],
    name: 'updateMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'admin',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'granted', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'AdminUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'jarAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'JarCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'jarAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'metadata',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'MetadataUpdated',
  },
  { type: 'error', inputs: [], name: 'InvalidTokenAddress' },
  { type: 'error', inputs: [], name: 'JarNotFound' },
  { type: 'error', inputs: [], name: 'NotAuthorized' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// erc20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const erc20Abi = [
  {
    type: 'event',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
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

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"ACCESS_TYPE"`
 */
export const useReadCookieJarAccessType = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'ACCESS_TYPE',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"CFA"`
 */
export const useReadCookieJarCfa = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'CFA',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"CURRENCY"`
 */
export const useReadCookieJarCurrency = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'CURRENCY',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"DEFAULT_ADMIN_ROLE"`
 */
export const useReadCookieJarDefaultAdminRole =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'DEFAULT_ADMIN_ROLE',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"EMERGENCY_WITHDRAWAL_ENABLED"`
 */
export const useReadCookieJarEmergencyWithdrawalEnabled =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'EMERGENCY_WITHDRAWAL_ENABLED',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"FEE_PERCENTAGE_ON_DEPOSIT"`
 */
export const useReadCookieJarFeePercentageOnDeposit =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'FEE_PERCENTAGE_ON_DEPOSIT',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"MAX_WITHDRAWAL_PER_PERIOD"`
 */
export const useReadCookieJarMaxWithdrawalPerPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'MAX_WITHDRAWAL_PER_PERIOD',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"MIN_DEPOSIT"`
 */
export const useReadCookieJarMinDeposit = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'MIN_DEPOSIT',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"ONE_TIME_WITHDRAWAL"`
 */
export const useReadCookieJarOneTimeWithdrawal =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'ONE_TIME_WITHDRAWAL',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"STRICT_PURPOSE"`
 */
export const useReadCookieJarStrictPurpose =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'STRICT_PURPOSE',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"SUPERFLUID_HOST"`
 */
export const useReadCookieJarSuperfluidHost =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'SUPERFLUID_HOST',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"WITHDRAWAL_OPTION"`
 */
export const useReadCookieJarWithdrawalOption =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'WITHDRAWAL_OPTION',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"allowlist"`
 */
export const useReadCookieJarAllowlist = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'allowlist',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"currencyHeldByJar"`
 */
export const useReadCookieJarCurrencyHeldByJar =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'currencyHeldByJar',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"feeCollector"`
 */
export const useReadCookieJarFeeCollector = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarAbi, functionName: 'feeCollector' }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"fixedAmount"`
 */
export const useReadCookieJarFixedAmount = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'fixedAmount',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getAccountFlowInfo"`
 */
export const useReadCookieJarGetAccountFlowInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'getAccountFlowInfo',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getAllowlist"`
 */
export const useReadCookieJarGetAllowlist = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarAbi, functionName: 'getAllowlist' }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getNetFlowRate"`
 */
export const useReadCookieJarGetNetFlowRate =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'getNetFlowRate',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getPendingTokenAddresses"`
 */
export const useReadCookieJarGetPendingTokenAddresses =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'getPendingTokenAddresses',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getRoleAdmin"`
 */
export const useReadCookieJarGetRoleAdmin = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarAbi, functionName: 'getRoleAdmin' }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"getSuperStreamInfo"`
 */
export const useReadCookieJarGetSuperStreamInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'getSuperStreamInfo',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"hasRole"`
 */
export const useReadCookieJarHasRole = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'hasRole',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"lastWithdrawalTime"`
 */
export const useReadCookieJarLastWithdrawalTime =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'lastWithdrawalTime',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"maxWithdrawal"`
 */
export const useReadCookieJarMaxWithdrawal =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'maxWithdrawal',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"multiTokenConfig"`
 */
export const useReadCookieJarMultiTokenConfig =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'multiTokenConfig',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"nftRequirement"`
 */
export const useReadCookieJarNftRequirement =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'nftRequirement',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"paused"`
 */
export const useReadCookieJarPaused = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarAbi,
  functionName: 'paused',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"pendingTokenBalances"`
 */
export const useReadCookieJarPendingTokenBalances =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'pendingTokenBalances',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"superStreams"`
 */
export const useReadCookieJarSuperStreams = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarAbi, functionName: 'superStreams' }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"superTokenFlowRates"`
 */
export const useReadCookieJarSuperTokenFlowRates =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'superTokenFlowRates',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadCookieJarSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'supportsInterface',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"totalWithdrawn"`
 */
export const useReadCookieJarTotalWithdrawn =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'totalWithdrawn',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawalInterval"`
 */
export const useReadCookieJarWithdrawalInterval =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'withdrawalInterval',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawnInCurrentPeriod"`
 */
export const useReadCookieJarWithdrawnInCurrentPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarAbi,
    functionName: 'withdrawnInCurrentPeriod',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useWriteCookieJar = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"createSuperStream"`
 */
export const useWriteCookieJarCreateSuperStream =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'createSuperStream',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"deleteSuperStream"`
 */
export const useWriteCookieJarDeleteSuperStream =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'deleteSuperStream',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"deposit"`
 */
export const useWriteCookieJarDeposit = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
  functionName: 'deposit',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"emergencyWithdraw"`
 */
export const useWriteCookieJarEmergencyWithdraw =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'emergencyWithdraw',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"grantJarAllowlistRole"`
 */
export const useWriteCookieJarGrantJarAllowlistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'grantJarAllowlistRole',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"grantRole"`
 */
export const useWriteCookieJarGrantRole = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
  functionName: 'grantRole',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"pause"`
 */
export const useWriteCookieJarPause = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
  functionName: 'pause',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"renounceRole"`
 */
export const useWriteCookieJarRenounceRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'renounceRole',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"revokeJarAllowlistRole"`
 */
export const useWriteCookieJarRevokeJarAllowlistRole =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'revokeJarAllowlistRole',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"revokeRole"`
 */
export const useWriteCookieJarRevokeRole = /*#__PURE__*/ createUseWriteContract(
  { abi: cookieJarAbi, functionName: 'revokeRole' }
);

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"swapPendingTokens"`
 */
export const useWriteCookieJarSwapPendingTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'swapPendingTokens',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"unpause"`
 */
export const useWriteCookieJarUnpause = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
  functionName: 'unpause',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFeeCollector"`
 */
export const useWriteCookieJarUpdateFeeCollector =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'updateFeeCollector',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFixedWithdrawalAmount"`
 */
export const useWriteCookieJarUpdateFixedWithdrawalAmount =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'updateFixedWithdrawalAmount',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateMaxWithdrawalAmount"`
 */
export const useWriteCookieJarUpdateMaxWithdrawalAmount =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'updateMaxWithdrawalAmount',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateSuperStream"`
 */
export const useWriteCookieJarUpdateSuperStream =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'updateSuperStream',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateWithdrawalInterval"`
 */
export const useWriteCookieJarUpdateWithdrawalInterval =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'updateWithdrawalInterval',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdraw"`
 */
export const useWriteCookieJarWithdraw = /*#__PURE__*/ createUseWriteContract({
  abi: cookieJarAbi,
  functionName: 'withdraw',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawAllowlistMode"`
 */
export const useWriteCookieJarWithdrawAllowlistMode =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'withdrawAllowlistMode',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWithErc1155"`
 */
export const useWriteCookieJarWithdrawWithErc1155 =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'withdrawWithErc1155',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWithErc721"`
 */
export const useWriteCookieJarWithdrawWithErc721 =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarAbi,
    functionName: 'withdrawWithErc721',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useSimulateCookieJar = /*#__PURE__*/ createUseSimulateContract({
  abi: cookieJarAbi,
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"createSuperStream"`
 */
export const useSimulateCookieJarCreateSuperStream =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'createSuperStream',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"deleteSuperStream"`
 */
export const useSimulateCookieJarDeleteSuperStream =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'deleteSuperStream',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"deposit"`
 */
export const useSimulateCookieJarDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'deposit',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"emergencyWithdraw"`
 */
export const useSimulateCookieJarEmergencyWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'emergencyWithdraw',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"grantJarAllowlistRole"`
 */
export const useSimulateCookieJarGrantJarAllowlistRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'grantJarAllowlistRole',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"grantRole"`
 */
export const useSimulateCookieJarGrantRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'grantRole',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"pause"`
 */
export const useSimulateCookieJarPause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'pause',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"renounceRole"`
 */
export const useSimulateCookieJarRenounceRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'renounceRole',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"revokeJarAllowlistRole"`
 */
export const useSimulateCookieJarRevokeJarAllowlistRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'revokeJarAllowlistRole',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"revokeRole"`
 */
export const useSimulateCookieJarRevokeRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'revokeRole',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"swapPendingTokens"`
 */
export const useSimulateCookieJarSwapPendingTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'swapPendingTokens',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"unpause"`
 */
export const useSimulateCookieJarUnpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'unpause',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFeeCollector"`
 */
export const useSimulateCookieJarUpdateFeeCollector =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'updateFeeCollector',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateFixedWithdrawalAmount"`
 */
export const useSimulateCookieJarUpdateFixedWithdrawalAmount =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'updateFixedWithdrawalAmount',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateMaxWithdrawalAmount"`
 */
export const useSimulateCookieJarUpdateMaxWithdrawalAmount =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'updateMaxWithdrawalAmount',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateSuperStream"`
 */
export const useSimulateCookieJarUpdateSuperStream =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'updateSuperStream',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"updateWithdrawalInterval"`
 */
export const useSimulateCookieJarUpdateWithdrawalInterval =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'updateWithdrawalInterval',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdraw"`
 */
export const useSimulateCookieJarWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'withdraw',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawAllowlistMode"`
 */
export const useSimulateCookieJarWithdrawAllowlistMode =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'withdrawAllowlistMode',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWithErc1155"`
 */
export const useSimulateCookieJarWithdrawWithErc1155 =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'withdrawWithErc1155',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarAbi}__ and `functionName` set to `"withdrawWithErc721"`
 */
export const useSimulateCookieJarWithdrawWithErc721 =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarAbi,
    functionName: 'withdrawWithErc721',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__
 */
export const useWatchCookieJarEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: cookieJarAbi }
);

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"Deposit"`
 */
export const useWatchCookieJarDepositEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'Deposit',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"EmergencyWithdrawal"`
 */
export const useWatchCookieJarEmergencyWithdrawalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'EmergencyWithdrawal',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"FeeCollected"`
 */
export const useWatchCookieJarFeeCollectedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'FeeCollected',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"FeeCollectorUpdated"`
 */
export const useWatchCookieJarFeeCollectorUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'FeeCollectorUpdated',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"ParameterUpdated"`
 */
export const useWatchCookieJarParameterUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'ParameterUpdated',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"Paused"`
 */
export const useWatchCookieJarPausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'Paused',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"PausedStateChanged"`
 */
export const useWatchCookieJarPausedStateChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'PausedStateChanged',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"PendingTokensRecovered"`
 */
export const useWatchCookieJarPendingTokensRecoveredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'PendingTokensRecovered',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"RoleAdminChanged"`
 */
export const useWatchCookieJarRoleAdminChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'RoleAdminChanged',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"RoleGranted"`
 */
export const useWatchCookieJarRoleGrantedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'RoleGranted',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"RoleRevoked"`
 */
export const useWatchCookieJarRoleRevokedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'RoleRevoked',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"TokenSwapped"`
 */
export const useWatchCookieJarTokenSwappedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'TokenSwapped',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarAbi}__ and `eventName` set to `"Unpaused"`
 */
export const useWatchCookieJarUnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarAbi,
    eventName: 'Unpaused',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__
 */
export const useReadCookieJarFactory = /*#__PURE__*/ createUseReadContract({
  abi: cookieJarFactoryAbi,
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"DEFAULT_FEE_COLLECTOR"`
 */
export const useReadCookieJarFactoryDefaultFeeCollector =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'DEFAULT_FEE_COLLECTOR',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"DEFAULT_FEE_PERCENTAGE"`
 */
export const useReadCookieJarFactoryDefaultFeePercentage =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'DEFAULT_FEE_PERCENTAGE',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"MIN_ERC20_DEPOSIT"`
 */
export const useReadCookieJarFactoryMinErc20Deposit =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'MIN_ERC20_DEPOSIT',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"MIN_ETH_DEPOSIT"`
 */
export const useReadCookieJarFactoryMinEthDeposit =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'MIN_ETH_DEPOSIT',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"OWNER"`
 */
export const useReadCookieJarFactoryOwner = /*#__PURE__*/ createUseReadContract(
  { abi: cookieJarFactoryAbi, functionName: 'OWNER' }
);

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"admins"`
 */
export const useReadCookieJarFactoryAdmins =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'admins',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"cookieJars"`
 */
export const useReadCookieJarFactoryCookieJars =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'cookieJars',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"getAllJars"`
 */
export const useReadCookieJarFactoryGetAllJars =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'getAllJars',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"getJarCount"`
 */
export const useReadCookieJarFactoryGetJarCount =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'getJarCount',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"getJarInfo"`
 */
export const useReadCookieJarFactoryGetJarInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'getJarInfo',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"getMetadata"`
 */
export const useReadCookieJarFactoryGetMetadata =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'getMetadata',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"jarInfo"`
 */
export const useReadCookieJarFactoryJarInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: cookieJarFactoryAbi,
    functionName: 'jarInfo',
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
    abi: cookieJarFactoryAbi,
    functionName: 'createCookieJar',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"setAdmin"`
 */
export const useWriteCookieJarFactorySetAdmin =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarFactoryAbi,
    functionName: 'setAdmin',
  });

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateMetadata"`
 */
export const useWriteCookieJarFactoryUpdateMetadata =
  /*#__PURE__*/ createUseWriteContract({
    abi: cookieJarFactoryAbi,
    functionName: 'updateMetadata',
  });

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
    functionName: 'createCookieJar',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"setAdmin"`
 */
export const useSimulateCookieJarFactorySetAdmin =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarFactoryAbi,
    functionName: 'setAdmin',
  });

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `functionName` set to `"updateMetadata"`
 */
export const useSimulateCookieJarFactoryUpdateMetadata =
  /*#__PURE__*/ createUseSimulateContract({
    abi: cookieJarFactoryAbi,
    functionName: 'updateMetadata',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__
 */
export const useWatchCookieJarFactoryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: cookieJarFactoryAbi });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"AdminUpdated"`
 */
export const useWatchCookieJarFactoryAdminUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarFactoryAbi,
    eventName: 'AdminUpdated',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"JarCreated"`
 */
export const useWatchCookieJarFactoryJarCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarFactoryAbi,
    eventName: 'JarCreated',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link cookieJarFactoryAbi}__ and `eventName` set to `"MetadataUpdated"`
 */
export const useWatchCookieJarFactoryMetadataUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: cookieJarFactoryAbi,
    eventName: 'MetadataUpdated',
  });

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useReadErc20 = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"allowance"`
 */
export const useReadErc20Allowance = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'allowance',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadErc20BalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'balanceOf',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"decimals"`
 */
export const useReadErc20Decimals = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'decimals',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"name"`
 */
export const useReadErc20Name = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'name',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"symbol"`
 */
export const useReadErc20Symbol = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'symbol',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadErc20TotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'totalSupply',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useWriteErc20 = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"approve"`
 */
export const useWriteErc20Approve = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'approve',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transfer"`
 */
export const useWriteErc20Transfer = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'transfer',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteErc20TransferFrom = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'transferFrom',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useSimulateErc20 = /*#__PURE__*/ createUseSimulateContract({
  abi: erc20Abi,
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"approve"`
 */
export const useSimulateErc20Approve = /*#__PURE__*/ createUseSimulateContract({
  abi: erc20Abi,
  functionName: 'approve',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transfer"`
 */
export const useSimulateErc20Transfer = /*#__PURE__*/ createUseSimulateContract(
  { abi: erc20Abi, functionName: 'transfer' }
);

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateErc20TransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc20Abi,
    functionName: 'transferFrom',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__
 */
export const useWatchErc20Event = /*#__PURE__*/ createUseWatchContractEvent({
  abi: erc20Abi,
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__ and `eventName` set to `"Approval"`
 */
export const useWatchErc20ApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc20Abi,
    eventName: 'Approval',
  });

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchErc20TransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc20Abi,
    eventName: 'Transfer',
  });
