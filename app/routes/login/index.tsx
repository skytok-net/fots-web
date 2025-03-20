"use client";

import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { LoginForm } from "~/components/auth/login-form";
import { useAuth } from "~/hooks/use-auth";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to home page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Only render the form if not authenticated
  if (isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Log in to your Food on the Stove account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
