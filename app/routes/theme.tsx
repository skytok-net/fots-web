import { ThemeShowcase } from '~/components/theme-showcase';
import { Header } from '~/components/header';
import { Footer } from '~/components/footer';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [
    { title: "Theme Guide - Food on the Stove" },
    { name: "description", content: "Color theme and design system for Food on the Stove" },
  ];
};

export default function ThemePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ThemeShowcase />
      </main>
      <Footer />
    </div>
  );
}
