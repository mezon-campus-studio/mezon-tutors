import HomeBlogsSection from "./components/HomeBlogsSection";
import HomeFeaturedTutorsSection from "./components/HomeFeaturedTutorsSection";
import HomeHeroSection from "./components/HomeHeroSection";
import HomeEventsSection from "./components/HomeEventsSection";
import HomeHowItWorksSection from "./components/HomeHowItWorksSection";
import HomeMezonShowcaseSection from "./components/HomeMezonShowcaseSection";
import HomeTestimonialsSection from "./components/HomeTestimonialsSection";
import HomeWhyUsSection from "./components/HomeWhyUsSection";

export default function HomePage() {
  return (
    <main className="w-full max-w-full overflow-x-clip bg-white text-slate-900">
      <HomeHeroSection />
      <HomeHowItWorksSection />
      <HomeEventsSection />
      <HomeFeaturedTutorsSection />
      <HomeBlogsSection />
      <HomeWhyUsSection />
      <HomeMezonShowcaseSection />
      <HomeTestimonialsSection />
    </main>
  );
}
