import { useJarCreation as useCreation } from "@jar-core/hooks/jar/useJarCreation";
import { FEATURED_JAR } from "@/config/featured-jar";
import { STIPEND_PRESET } from "@/config/stipend-preset";
import { navigate } from "@/navigation/router";

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
	return useCreation({
		defaultChainId: FEATURED_JAR.chainId,
		preset: STIPEND_PRESET,
		onCreated: navigate,
	});
}
