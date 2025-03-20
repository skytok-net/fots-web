"use client";

import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { RegisterForm } from "~/components/auth/register-form";
import { useAuth } from "~/hooks/use-auth";

export default function Register() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Join Food on the Stove and connect with our community
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
