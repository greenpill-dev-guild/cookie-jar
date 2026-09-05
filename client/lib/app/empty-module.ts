// Stand-in for optional wallet-SDK modules that are aliased away in next.config.mjs
// (@x402/*, React Native async storage, pino-pretty). None of these code paths run in
// this app. Turbopack checks named imports statically, so the names the SDKs import
// must exist here; calling them is a bug and throws.

const unavailable = (name: string) => (): never => {
	throw new Error(`${name} is not available in this build`);
};

export const toClientEvmSigner = unavailable("@x402/evm toClientEvmSigner");

export default {};
