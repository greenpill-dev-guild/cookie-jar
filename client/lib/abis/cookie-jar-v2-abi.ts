/**
 * Cookie Jar Factory v2 ABI - Optimized struct-based functions
 */
export const cookieJarFactoryV2Abi = [
  // Read functions
  {
    "inputs": [],
    "name": "getCookieJars",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "metadatas", 
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Optimized struct-based create functions
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "cookieJarOwner", "type": "address" },
          { "internalType": "address", "name": "supportedCurrency", "type": "address" },
          { "internalType": "enum CookieJarLib.AccessType", "name": "accessType", "type": "uint8" },
          { "internalType": "enum CookieJarLib.WithdrawalTypeOptions", "name": "withdrawalOption", "type": "uint8" },
          { "internalType": "uint256", "name": "fixedAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "maxWithdrawal", "type": "uint256" },
          { "internalType": "uint256", "name": "withdrawalInterval", "type": "uint256" },
          { "internalType": "bool", "name": "strictPurpose", "type": "bool" },
          { "internalType": "bool", "name": "emergencyWithdrawalEnabled", "type": "bool" },
          { "internalType": "bool", "name": "oneTimeWithdrawal", "type": "bool" },
          { "internalType": "string", "name": "metadata", "type": "string" },
          { "internalType": "uint256", "name": "customFeePercentage", "type": "uint256" }
        ],
        "internalType": "struct CookieJarLib.CreateJarParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "address[]", "name": "nftAddresses", "type": "address[]" },
          { "internalType": "enum CookieJarLib.NFTType[]", "name": "nftTypes", "type": "uint8[]" },
          { "internalType": "address[]", "name": "allowlist", "type": "address[]" },
          {
            "components": [
              { "internalType": "uint256", "name": "eventId", "type": "uint256" },
              { "internalType": "address", "name": "poapContract", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.POAPRequirement",
            "name": "poapReq",
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "address", "name": "lockAddress", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.UnlockRequirement",
            "name": "unlockReq", 
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "address", "name": "tokenContract", "type": "address" },
              { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
              { "internalType": "uint256", "name": "minBalance", "type": "uint256" }
            ],
            "internalType": "struct CookieJarLib.HypercertRequirement",
            "name": "hypercertReq",
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "uint256", "name": "hatId", "type": "uint256" },
              { "internalType": "address", "name": "hatsContract", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.HatsRequirement", 
            "name": "hatsReq",
            "type": "tuple"
          }
        ],
        "internalType": "struct CookieJarLib.AccessConfig",
        "name": "accessConfig",
        "type": "tuple"
      }
    ],
    "name": "createCookieJar",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "cookieJarOwner", "type": "address" },
          { "internalType": "address", "name": "supportedCurrency", "type": "address" },
          { "internalType": "enum CookieJarLib.AccessType", "name": "accessType", "type": "uint8" },
          { "internalType": "enum CookieJarLib.WithdrawalTypeOptions", "name": "withdrawalOption", "type": "uint8" },
          { "internalType": "uint256", "name": "fixedAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "maxWithdrawal", "type": "uint256" },
          { "internalType": "uint256", "name": "withdrawalInterval", "type": "uint256" },
          { "internalType": "bool", "name": "strictPurpose", "type": "bool" },
          { "internalType": "bool", "name": "emergencyWithdrawalEnabled", "type": "bool" },
          { "internalType": "bool", "name": "oneTimeWithdrawal", "type": "bool" },
          { "internalType": "string", "name": "metadata", "type": "string" },
          { "internalType": "uint256", "name": "customFeePercentage", "type": "uint256" }
        ],
        "internalType": "struct CookieJarLib.CreateJarParams",
        "name": "params", 
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "address[]", "name": "nftAddresses", "type": "address[]" },
          { "internalType": "enum CookieJarLib.NFTType[]", "name": "nftTypes", "type": "uint8[]" },
          { "internalType": "address[]", "name": "allowlist", "type": "address[]" },
          {
            "components": [
              { "internalType": "uint256", "name": "eventId", "type": "uint256" },
              { "internalType": "address", "name": "poapContract", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.POAPRequirement",
            "name": "poapReq",
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "address", "name": "lockAddress", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.UnlockRequirement",
            "name": "unlockReq",
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "address", "name": "tokenContract", "type": "address" },
              { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
              { "internalType": "uint256", "name": "minBalance", "type": "uint256" }
            ],
            "internalType": "struct CookieJarLib.HypercertRequirement",
            "name": "hypercertReq",
            "type": "tuple"
          },
          {
            "components": [
              { "internalType": "uint256", "name": "hatId", "type": "uint256" },
              { "internalType": "address", "name": "hatsContract", "type": "address" }
            ],
            "internalType": "struct CookieJarLib.HatsRequirement",
            "name": "hatsReq", 
            "type": "tuple"
          }
        ],
        "internalType": "struct CookieJarLib.AccessConfig",
        "name": "accessConfig",
        "type": "tuple"
      }
    ],
    "name": "createCookieJarWithFee",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "cookieJarAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "metadata", "type": "string" }
    ],
    "name": "CookieJarCreated",
    "type": "event"
  }
] as const
