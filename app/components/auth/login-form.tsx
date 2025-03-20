"use client"

import { useState } from "react"
import { useNavigate } from "@remix-run/react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form"
import { useAuth } from "~/hooks/use-auth"

// Define the form schema with Zod
const loginFormSchema = z.object({
  identifier: z.string().min(1, {
    message: "Email or handle is required",
  }),
  password: z.string().min(1, {
    message: "Password is required",
  }),
  pdsServer: z.string().url({
    message: "Please enter a valid URL",
  }),
  customServer: z.boolean().default(false),
})

// Infer the form values type from the schema
type LoginFormValues = z.infer<typeof loginFormSchema>

// Default values for the form
const defaultValues: Partial<LoginFormValues> = {
  identifier: "",
  password: "",
  pdsServer: "https://bsky.social",
  customServer: false,
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  })

  // Handle form submission
  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await login(data.identifier, data.password, data.pdsServer)
      
      if (result instanceof Error) {
        setError(result.message)
      } else {
        // Redirect to landing page on successful login
        navigate("/")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email or handle below to login to your account
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          {error && (
            <div className="p-3 text-sm text-white bg-destructive rounded-md">
              {error}
            </div>
          )}
          
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or Handle</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="email@example.com or username.bsky.social" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="customServer"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Use custom PDS server</FormLabel>
                  <FormDescription>
                    Check this to use a different AT Protocol server
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="pdsServer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PDS Server URL</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    disabled={!form.watch("customServer") || isLoading}
                  />
                </FormControl>
                <FormDescription>
                  The AT Protocol server URL to connect to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Form>
      
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a href="/register" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </div>
  )
}
