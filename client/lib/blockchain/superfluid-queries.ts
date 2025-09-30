/**
 * GraphQL Queries for Superfluid Subgraph
 * 
 * Queries for fetching stream data from The Graph
 */

import { gql } from "graphql-request";

/**
 * Query to fetch all active streams flowing to a specific receiver (jar address)
 */
export const GET_STREAMS_BY_RECEIVER = gql`
  query GetStreamsByReceiver($receiver: String!, $first: Int = 100, $skip: Int = 0) {
    streams(
      where: { 
        receiver: $receiver,
        currentFlowRate_gt: "0"
      }
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
    ) {
      id
      createdAtTimestamp
      updatedAtTimestamp
      currentFlowRate
      streamedUntilUpdatedAt
      token {
        id
        symbol
        name
        decimals
      }
      sender {
        id
      }
      receiver {
        id
      }
    }
  }
`;

/**
 * Query to fetch account stream information (net flow rate, deposits)
 */
export const GET_ACCOUNT_STREAM_INFO = gql`
  query GetAccountStreamInfo($account: String!) {
    account(id: $account) {
      id
      isSuperApp
      createdAtTimestamp
      updatedAtTimestamp
      accountTokenSnapshots {
        token {
          id
          symbol
          name
          decimals
        }
        totalNetFlowRate
        totalInflowRate
        totalOutflowRate
        totalAmountStreamedUntilUpdatedAt
        totalAmountTransferredUntilUpdatedAt
        totalDeposit
        totalCFADeposit
        totalGDADeposit
        balanceUntilUpdatedAt
        updatedAtTimestamp
      }
    }
  }
`;

/**
 * Query to fetch stream details by token and sender/receiver pair
 */
export const GET_STREAM_BY_PARTIES = gql`
  query GetStreamByParties($sender: String!, $receiver: String!, $token: String!) {
    streams(
      where: {
        sender: $sender
        receiver: $receiver
        token: $token
      }
      first: 1
    ) {
      id
      createdAtTimestamp
      updatedAtTimestamp
      currentFlowRate
      streamedUntilUpdatedAt
      token {
        id
        symbol
        name
        decimals
      }
      sender {
        id
      }
      receiver {
        id
      }
      flowUpdatedEvents(
        first: 10
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        timestamp
        flowRate
        totalAmountStreamedUntilTimestamp
        transaction {
          id
          timestamp
        }
      }
    }
  }
`;

/**
 * Query to fetch historical stream events for a receiver
 */
export const GET_STREAM_HISTORY = gql`
  query GetStreamHistory($receiver: String!, $first: Int = 50) {
    flowUpdatedEvents(
      where: { receiver: $receiver }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      timestamp
      flowRate
      totalAmountStreamedUntilTimestamp
      token
      sender
      receiver
      stream {
        id
        currentFlowRate
        createdAtTimestamp
      }
      transaction {
        id
        timestamp
        blockNumber
      }
    }
  }
`;

/**
 * Query to get super token information
 */
export const GET_SUPER_TOKEN_INFO = gql`
  query GetSuperTokenInfo($tokenAddress: String!) {
    token(id: $tokenAddress) {
      id
      symbol
      name
      decimals
      underlyingAddress
      isSuperToken
      isNativeAssetSuperToken
      isListed
      createdAtTimestamp
      updatedAtTimestamp
    }
  }
`;

/**
 * Types for GraphQL responses
 */

export interface StreamData {
  id: string;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
  currentFlowRate: string;
  streamedUntilUpdatedAt: string;
  token: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  sender: {
    id: string;
  };
  receiver: {
    id: string;
  };
}

export interface AccountTokenSnapshot {
  token: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  totalNetFlowRate: string;
  totalInflowRate: string;
  totalOutflowRate: string;
  totalAmountStreamedUntilUpdatedAt: string;
  totalDeposit: string;
  totalCFADeposit: string;
  balanceUntilUpdatedAt: string;
  updatedAtTimestamp: string;
}

export interface AccountData {
  id: string;
  isSuperApp: boolean;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
  accountTokenSnapshots: AccountTokenSnapshot[];
}

export interface FlowUpdatedEvent {
  id: string;
  timestamp: string;
  flowRate: string;
  totalAmountStreamedUntilTimestamp: string;
  token: string;
  sender: string;
  receiver: string;
  stream?: {
    id: string;
    currentFlowRate: string;
    createdAtTimestamp: string;
  };
  transaction: {
    id: string;
    timestamp: string;
    blockNumber: string;
  };
}

export interface SuperTokenInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  underlyingAddress: string | null;
  isSuperToken: boolean;
  isNativeAssetSuperToken: boolean;
  isListed: boolean;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
}

export interface GetStreamsByReceiverResponse {
  streams: StreamData[];
}

export interface GetAccountStreamInfoResponse {
  account: AccountData | null;
}

export interface GetStreamByPartiesResponse {
  streams: StreamData[];
}

export interface GetStreamHistoryResponse {
  flowUpdatedEvents: FlowUpdatedEvent[];
}

export interface GetSuperTokenInfoResponse {
  token: SuperTokenInfo | null;
}
