import type { MetaFunction } from "@remix-run/node";
import { Header } from "~/components/header";
import { Hero } from "~/components/hero";
import { Features } from "~/components/features";
import { Feed } from "~/components/feed";
import { Footer } from "~/components/footer";

export const meta: MetaFunction = () => {
  return [
    { title: "FoodOnTheStove - Healthy Food for Our Heroes" },
    { name: "description", content: "Supporting firefighters, first responders, and healthcare workers with nutritious meals delivered to their workplace" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <Feed />
      </main>
      <Footer />
    </div>
  );
}