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
import { useAuthStore } from "~/stores/auth-store"

// Define the form schema with Zod
const registerFormSchema = z.object({
  handle: z.string().min(3, {
    message: "Handle must be at least 3 characters",
  }),
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
  firstName: z.string().min(1, {
    message: "First name is required",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required",
  }),
  pdsServer: z.string().url({
    message: "Please enter a valid URL",
  }),
  customServer: z.boolean().default(false),
})

// Infer the form values type from the schema
type RegisterFormValues = z.infer<typeof registerFormSchema>

// Default values for the form
const defaultValues: Partial<RegisterFormValues> = {
  handle: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  pdsServer: "https://bsky.social",
  customServer: false,
}

export interface RegisterFormProps extends React.ComponentPropsWithoutRef<"div"> {
  heading?: string
  subheading?: string
}

export function RegisterForm({
  className,
  heading = "Create your account",
  subheading = "Enter your details below to create your account",
  ...props
}: RegisterFormProps) {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues,
  })

  // Handle form submission
  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await register(
        data.handle, 
        data.email, 
        data.password, 
        data.pdsServer,
        data.firstName,
        data.lastName
      )
      
      if (result instanceof Error) {
        setError(result.message)
      } else {
        // Redirect to landing page on successful registration
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
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {subheading}
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {error && (
            <div className="p-3 text-sm text-white bg-destructive rounded-md">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John" 
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
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Doe" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="handle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Handle</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="username" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Your AT Protocol handle (without .bsky.social)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="email@example.com" 
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Password must be at least 8 characters
                </FormDescription>
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
          
          <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
      
      <div className="text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-primary underline underline-offset-4">
          Log in
        </a>
      </div>
    </div>
  )
}
