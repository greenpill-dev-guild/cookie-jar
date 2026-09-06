"use client";
import { useRouter } from "next/navigation";
import { FEATURED_JAR } from "@/config/featured-jar";
import { useJarCreation as useCreation } from "@jar-core/hooks/jar/useJarCreation";
export {
	AccessType,
	WithdrawalTypeOptions,
	NFTType,
} from "@jar-core/hooks/jar/useJarCreation";
export type {
	ProtocolConfig,
	JarCreationFormData,
} from "@jar-core/hooks/jar/useJarCreation";
export function useJarCreation() {
	const router = useRouter();
	return useCreation({
		defaultChainId: FEATURED_JAR.chainId,
		onCreated: router.push,
	});
}
