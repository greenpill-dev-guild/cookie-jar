"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface CreateJarModalsProps {
	showWalletModal: boolean;
	setShowWalletModal: (_show: boolean) => void;
	isCreating: boolean;
	isWaitingForTx: boolean;
}

export const CreateJarModals: React.FC<CreateJarModalsProps> = ({
	showWalletModal,
	setShowWalletModal,
	isCreating,
	isWaitingForTx,
}) => {
	const { openConnectModal } = useConnectModal();
	return (
		<>
			<Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Connect your wallet</DialogTitle>
						<DialogDescription>
							After connecting, review your settings and select Create Jar to
							continue.
						</DialogDescription>
					</DialogHeader>
					<Button
						onClick={() => {
							setShowWalletModal(false);
							openConnectModal?.();
						}}
					>
						Choose wallet
					</Button>
					<Button variant="outline" onClick={() => setShowWalletModal(false)}>
						Cancel
					</Button>
				</DialogContent>
			</Dialog>

			{(isCreating || isWaitingForTx) && (
				<p role="status" className="mt-4 text-foreground">
					{isWaitingForTx
						? "Waiting for transaction confirmation..."
						: "Confirm creation in your wallet..."}
				</p>
			)}
		</>
	);
};
