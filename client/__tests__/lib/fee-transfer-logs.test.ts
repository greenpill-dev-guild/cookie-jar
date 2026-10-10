import { cookieJarAbi } from "@jar-core/generated";
import { depositFeeLogIndexes } from "@jar-core/lib/jar/fee-transfer-logs";
import {
	encodeAbiParameters,
	encodeEventTopics,
	erc20Abi,
	type Log,
} from "viem";
import { describe, expect, it } from "vitest";

const JAR = "0xfCA00fC7E287419F200840364fd9b7DC84E83e01";
const TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const COLLECTOR = "0xe09315A86ED0A39862158f5631b928145987fE05";
type ReceiptLog = Pick<Log, "address" | "data" | "topics" | "logIndex">;

const data = encodeAbiParameters([{ type: "uint256" }], [20_000n]);
function transfer(logIndex: number): ReceiptLog {
	return {
		address: TOKEN,
		logIndex,
		data,
		topics: encodeEventTopics({
			abi: erc20Abi,
			eventName: "Transfer",
			args: { from: JAR, to: COLLECTOR },
		}) as Log["topics"],
	};
}
function fee(logIndex: number): ReceiptLog {
	return {
		address: JAR,
		logIndex,
		data,
		topics: encodeEventTopics({
			abi: cookieJarAbi,
			eventName: "FeeCollected",
			args: { feeCollector: COLLECTOR, token: TOKEN },
		}) as Log["topics"],
	};
}

describe("depositFeeLogIndexes", () => {
	it("handles the Deposit event between the fee transfer and FeeCollected", () => {
		const deposit: ReceiptLog = {
			address: JAR,
			logIndex: 19,
			data,
			topics: encodeEventTopics({
				abi: cookieJarAbi,
				eventName: "Deposit",
				args: { depositor: COLLECTOR, token: TOKEN },
			}) as Log["topics"],
		};
		expect([
			...depositFeeLogIndexes([transfer(18), deposit, fee(20)], JAR),
		]).toEqual([18]);
	});

	it("excludes the fee without discarding an equal-sized claim in the same batch", () => {
		expect([
			...depositFeeLogIndexes([transfer(18), fee(20), transfer(21)], JAR),
		]).toEqual([18]);
	});

	it("does not confuse fees paid by another jar with this jar's claims", () => {
		const otherJarFee: ReceiptLog = { ...fee(20), address: COLLECTOR };
		expect([...depositFeeLogIndexes([transfer(18), otherJarFee], JAR)]).toEqual(
			[]
		);
	});

	it("matches separate fees to separate transfers in one Safe batch", () => {
		expect([
			...depositFeeLogIndexes(
				[transfer(18), fee(20), transfer(25), fee(27)],
				JAR
			),
		]).toEqual([18, 25]);
	});
});
