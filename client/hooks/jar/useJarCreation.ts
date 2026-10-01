"use client";
import { useJarCreation as useCreation } from "@jar-core/hooks/jar/useJarCreation";
import { useRouter } from "next/navigation";
import { FEATURED_JAR } from "@/config/featured-jar";

export type {
	JarCreationFormData,
	ProtocolConfig,
} from "@jar-core/hooks/jar/useJarCreation";
export {
	AccessType,
	NFTType,
	WithdrawalTypeOptions,
} from "@jar-core/hooks/jar/useJarCreation";
export function useJarCreation() {
	const router = useRouter();
	return useCreation({
		defaultChainId: FEATURED_JAR.chainId,
		onCreated: router.push,
	});
}
