/**
 * Cookie Jar v1 ABI - Contains the functions that differ from v2
 * Main differences: whitelist vs allowlist naming
 */

export const cookieJarV1Abi = [
  // Read functions with v1 naming
  {
    "inputs": [],
    "name": "getWhitelist",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "lastWithdrawalWhitelist",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "lastWithdrawalTimestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Write functions with v1 naming
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_users",
        "type": "address[]"
      }
    ],
    "name": "grantJarWhitelistRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_users",
        "type": "address[]"
      }
    ],
    "name": "revokeJarWhitelistRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "purpose",
        "type": "string"
      }
    ],
    "name": "withdrawWhitelistMode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Common functions that are the same in both versions
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "depositETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "depositCurrency",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

/**
 * Cookie Jar Factory v1 ABI - For creating jars on v1 chains
 * Based on the v1 contract signature provided by the user
 */
export const cookieJarFactoryV1Abi = [
  // Read functions
  {
    "inputs": [],
    "name": "getCookieJars",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "metadatas",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Main create function for v1 - based on exact contract signature
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_cookieJarOwner",
        "type": "address"
      },
      {
        "internalType": "address", 
        "name": "_supportedCurrency",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "_accessType",
        "type": "uint8"
      },
      {
        "internalType": "address[]",
        "name": "_nftAddresses", 
        "type": "address[]"
      },
      {
        "internalType": "uint8[]",
        "name": "_nftTypes",
        "type": "uint8[]"
      },
      {
        "internalType": "uint8",
        "name": "_withdrawalOption",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_fixedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256", 
        "name": "_maxWithdrawal",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_withdrawalInterval", 
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_strictPurpose",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_emergencyWithdrawalEnabled",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_oneTimeWithdrawal",
        "type": "bool"
      },
      {
        "internalType": "address[]",
        "name": "_whitelist",
        "type": "address[]"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "name": "createCookieJar",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Additional functions present in v1 factory
  {
    "inputs": [],
    "name": "defaultFeeCollector",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defaultFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minETHDeposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minERC20Deposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address", 
        "name": "cookieJarAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "name": "CookieJarCreated",
    "type": "event"
  }
] as const
