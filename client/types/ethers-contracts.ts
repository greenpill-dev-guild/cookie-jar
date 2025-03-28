import type { BaseContract } from "ethers"

export interface CookieJarFactoryContract extends BaseContract {
  createCookieJar(
    name: string,
    description: string,
    maxWithdrawalAmount: bigint | string,
    cooldownPeriod: number,
    requirePurpose: boolean,
    fixedWithdrawalAmount: boolean,
    emergencyWithdrawalEnabled: boolean,
    useWhitelist: boolean,
  ): Promise<any>
  cookieJars(index: number): Promise<string>
  getCookieJarsCount(): Promise<bigint>
  isCookieJar(jarAddress: string): Promise<boolean>
  blacklistJar(jarAddress: string, isBlacklisted: boolean): Promise<any>
  blacklistOwner(ownerAddress: string, isBlacklisted: boolean): Promise<any>
  isJarBlacklisted(jarAddress: string): Promise<boolean>
  isOwnerBlacklisted(ownerAddress: string): Promise<boolean>
  blacklistedJars(jarAddress: string): Promise<boolean>
  blacklistedOwners(ownerAddress: string): Promise<boolean>
  feeCollector(): Promise<string>
}

export interface CookieJarContract extends BaseContract {
  jarConfig(): Promise<[string, string, bigint, bigint, boolean, boolean, boolean]>
  useWhitelist(): Promise<boolean>
  whitelist(user: string): Promise<boolean>
  blacklist(user: string): Promise<boolean>
  lastWithdrawalTime(user: string): Promise<bigint>
  isAdmin(user: string): Promise<boolean>
  feeCollector(): Promise<string>
  isEligibleToWithdraw(user: string): Promise<boolean>
  getBalance(token: string): Promise<bigint>
  getWithdrawalHistoryLength(): Promise<bigint>
  withdrawalHistory(index: number): Promise<[string, bigint, string, bigint]>
  nftGates(index: number): Promise<[string, bigint, boolean, bigint]>
  getNFTGatesLength(): Promise<bigint>

  // Write functions
  depositETH(options?: { value: bigint }): Promise<any>
  depositERC20(token: string, amount: bigint): Promise<any>
  withdrawETH(amount: bigint, purpose: string): Promise<any>
  withdrawERC20(token: string, amount: bigint, purpose: string): Promise<any>
  emergencyWithdraw(token: string): Promise<any>
  addToWhitelist(user: string): Promise<any>
  removeFromWhitelist(user: string): Promise<any>
  addToBlacklist(user: string): Promise<any>
  removeFromBlacklist(user: string): Promise<any>
  addNFTGate(nftAddress: string, tokenId: bigint, isERC1155: boolean, minBalance: bigint): Promise<any>
  removeNFTGate(index: number): Promise<any>
  setAdmin(admin: string, status: boolean): Promise<any>
  setFeeCollector(newFeeCollector: string): Promise<any>
  updateJarConfig(
    name: string,
    description: string,
    maxWithdrawalAmount: bigint,
    cooldownPeriod: bigint,
    requirePurpose: boolean,
    fixedWithdrawalAmount: boolean,
    emergencyWithdrawalEnabled: boolean,
  ): Promise<any>
}

export interface ERC20Contract extends BaseContract {
  name(): Promise<string>
  symbol(): Promise<string>
  decimals(): Promise<number>
  balanceOf(owner: string): Promise<bigint>
  allowance(owner: string, spender: string): Promise<bigint>
  approve(spender: string, value: bigint): Promise<any>
  transfer(to: string, value: bigint): Promise<any>
  transferFrom(from: string, to: string, value: bigint): Promise<any>
}

