import { FEATURED_JAR } from "@/config/featured-jar";
import { STIPEND_PRESET } from "@/config/stipend-preset";
import { navigate } from "@/navigation/router";
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
	return useCreation({
		defaultChainId: FEATURED_JAR.chainId,
		preset: STIPEND_PRESET,
		onCreated: navigate,
	});
}
