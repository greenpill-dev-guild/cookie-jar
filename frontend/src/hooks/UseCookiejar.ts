import { keccak256, toUtf8Bytes } from "ethers";
import {
  useReadCookieJar,
  useReadCookieJarGetCurrency,
  useReadCookieJarGetCurrencyHeldByJar,
  useReadCookieJarAccessType,
  useReadCookieJarOwner,
  useReadCookieJarWithdrawalOption,
  useReadCookieJarFixedAmount,
  useReadCookieJarMaxWithdrawal,
  useReadCookieJarWithdrawalInterval,
  useReadCookieJarStrictPurpose,
  useReadCookieJarEmergencyWithdrawalEnabled,
  useReadCookieJarFeeCollector,
  useReadCookieJarHasRole,
  useReadCookieJarLastWithdrawalWhitelist,
  useReadCookieJarLastWithdrawalNft,
  useReadCookieJarOneTimeWithdrawal,
  useReadCookieJarGetPastWithdrawals,
} from "../generated";
import { useAccount, useBalance } from "wagmi";

/**
 * Enum for Access Type
 */
enum AccessType {
  Whitelist = 0,
  NFTGated = 1,
}

/**
 * Enum for Withdrawal Type Options
 */
enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}

/**
 * Hook to read all configuration values from the CookieJar contract
 * @returns All configuration values and loading/error states
 */
export const useCookieJarConfig = (address: `0x${string}`) => {
  const account = useAccount();
  const userAddress = account.address as `0x${string}`;

  const accessType = useReadCookieJarAccessType({ address });
  const admin = useReadCookieJarOwner({ address });
  const withdrawalOption = useReadCookieJarWithdrawalOption({ address });
  const fixedAmount = useReadCookieJarFixedAmount({ address });
  const maxWithdrawal = useReadCookieJarMaxWithdrawal({ address });
  const withdrawalInterval = useReadCookieJarWithdrawalInterval({ address });
  const strictPurpose = useReadCookieJarStrictPurpose({ address });
  const emergencyWithdrawalEnabled = useReadCookieJarEmergencyWithdrawalEnabled(
    { address }
  );
  const oneTimeWithdrawal = useReadCookieJarOneTimeWithdrawal({
    address,
  });

  const pastWithdrawals = useReadCookieJarGetPastWithdrawals({
    address,
  });
  const feeCollector = useReadCookieJarFeeCollector({ address });
  // Encode role names to bytes32, same as Solidity
  const JAR_OWNER = keccak256(toUtf8Bytes("JAR_OWNER")) as `0x${string}`;
  const JAR_BLACKLISTED = keccak256(
    toUtf8Bytes("JAR_BLACKLISTED")
  ) as `0x${string}`;
  const JAR_WHITELISTED = keccak256(
    toUtf8Bytes("JAR_WHITELISTED")
  ) as `0x${string}`;

  // Now use it in the function call
  const whitelist = useReadCookieJarHasRole({
    address,
    args: [JAR_WHITELISTED, userAddress],
  });

  const blacklist = useReadCookieJarHasRole({
    address,
    args: [JAR_BLACKLISTED, userAddress],
  });
  const lastWithdrawalWhitelist = useReadCookieJarLastWithdrawalWhitelist({
    address,
    args: [userAddress],
  });
  const lastWithdrawalNft = useReadCookieJarLastWithdrawalNft({
    address,
    args: [userAddress],
  });
  const balance = useReadCookieJarGetCurrencyHeldByJar({
    address,
  });
  const currency = useReadCookieJarGetCurrency({ address });

  const isLoading = [
    accessType.isLoading,
    admin.isLoading,
    withdrawalOption.isLoading,
    fixedAmount.isLoading,
    maxWithdrawal.isLoading,
    withdrawalInterval.isLoading,
    strictPurpose.isLoading,
    emergencyWithdrawalEnabled.isLoading,
    oneTimeWithdrawal.isLoading,
    pastWithdrawals.isLoading,
    feeCollector.isLoading,
    whitelist.isLoading,
    blacklist.isLoading,
    lastWithdrawalWhitelist.isLoading,
    lastWithdrawalNft.isLoading,
    currency.isLoading,
    balance.isLoading,
  ].some(Boolean);

  const hasError = [
    accessType.isError,
    admin.isError,
    withdrawalOption.isError,
    fixedAmount.isError,
    maxWithdrawal.isError,
    withdrawalInterval.isError,
    strictPurpose.isError,
    emergencyWithdrawalEnabled.isError,
    oneTimeWithdrawal.isError,
    feeCollector.isError,
    whitelist.isError,
    blacklist.isError,
    currency.isError,
    balance.isError,
  ].some(Boolean);

  const errors = [
    accessType.error,
    admin.error,
    withdrawalOption.error,
    fixedAmount.error,
    maxWithdrawal.error,
    withdrawalInterval.error,
    strictPurpose.error,
    emergencyWithdrawalEnabled.error,
    oneTimeWithdrawal.error,
    pastWithdrawals.error,
    feeCollector.error,
    whitelist.error,
    blacklist.error,
    lastWithdrawalWhitelist.error,
    lastWithdrawalNft.error,
    currency.error,
    balance.error,
  ].filter(Boolean);
  return {
    config: {
      contractAddress: address as `0x${string}`,
      accessType:
        accessType.data !== undefined ? AccessType[accessType.data] : undefined,
      admin: admin.data,
      withdrawalOption:
        withdrawalOption.data !== undefined
          ? WithdrawalTypeOptions[withdrawalOption.data]
          : undefined,
      fixedAmount: fixedAmount.data,
      maxWithdrawal: maxWithdrawal.data,
      withdrawalInterval: withdrawalInterval.data,
      strictPurpose: strictPurpose.data,
      emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.data,
      oneTimeWithdrawal: oneTimeWithdrawal.data,
      pastWithdrawals: pastWithdrawals.data,
      feeCollector: feeCollector.data,
      whitelist: whitelist.data,
      blacklist: blacklist.data,
      lastWithdrawalWhitelist: lastWithdrawalWhitelist.data,
      lastWithdrawalNft: lastWithdrawalNft.data,
      balance: balance.data,
      currency: currency.data,
    },
    isLoading,
    hasError,
    errors,
  };
};
