import { Footer } from "@/components/app/footer";
import { LandingHero } from "@/components/app/LandingHero";

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col overflow-x-hidden -mx-4 md:-mx-6 lg:-mx-8 -my-4">
			<LandingHero />
			<Footer />
		</div>
	);
}
