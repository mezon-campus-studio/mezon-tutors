import HomeBecomeTutorSection from "./components/HomeBecomeTutorSection";
import HomeCtaSection from "./components/HomeCtaSection";
import HomeFeaturedTutorsSection from "./components/HomeFeaturedTutorsSection";
import HomeHeroSection from "./components/HomeHeroSection";
import HomeHowItWorksSection from "./components/HomeHowItWorksSection";
import HomeMezonShowcaseSection from "./components/HomeMezonShowcaseSection";
import HomeStatsSection from "./components/HomeStatsSection";
import HomeTestimonialsSection from "./components/HomeTestimonialsSection";
import HomeWhyUsSection from "./components/HomeWhyUsSection";

export default function HomePage() {
  return (
    <main className="bg-white text-slate-900">
      <HomeHeroSection />
      <HomeStatsSection />
      <HomeHowItWorksSection />
      <HomeFeaturedTutorsSection />
      <HomeWhyUsSection />
      <HomeMezonShowcaseSection />
      <HomeTestimonialsSection />
      <HomeBecomeTutorSection />
      <HomeCtaSection />
    </main>
  );
}
