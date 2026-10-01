interface CreateJarHeaderProps {
	isV2Contract: boolean;
}

export function CreateJarHeader({ isV2Contract }: CreateJarHeaderProps) {
	return (
		<div className="mb-6">
			<div className="flex items-center justify-between mb-2">
				<h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--cj-dark-brown))]">
					Create a jar
				</h1>
			</div>
			<p className="text-[hsl(var(--cj-medium-brown))]">
				Choose the currency, claim rules and who can claim.
				{!isV2Contract && (
					<span className="ml-2 text-sm text-orange-600">
						• Allowlist access only
					</span>
				)}
			</p>
		</div>
	);
}
