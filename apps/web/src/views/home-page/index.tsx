import HomeBecomeTutorSection from "./components/HomeBecomeTutorSection";
import HomeFeaturesSection from "./components/HomeFeaturesSection";
import HomeHeroSection from "./components/HomeHeroSection";
import HomeSeamlessSection from "./components/HomeSeamlessSection";

export default function HomePage() {
  return (
    <main className="text-slate-900">
      <HomeHeroSection />
      <HomeFeaturesSection />
      <HomeBecomeTutorSection />
      <HomeSeamlessSection />
    </main>
  );
}
