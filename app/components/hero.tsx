import { Link } from '@remix-run/react';
import { useAuth } from '~/hooks/use-auth';

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">
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