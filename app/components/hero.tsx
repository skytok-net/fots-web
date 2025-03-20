import { Link } from '@remix-run/react';
import { useAuth } from '~/hooks/use-auth';

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 sm:py-16 md:py-20 w-full">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
          Healthy Food for Our Heroes
        </h1>
        <p className="text-xl mb-8">
          Supporting firefighters, first responders, and healthcare workers with nutritious meals delivered to their workplace
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
