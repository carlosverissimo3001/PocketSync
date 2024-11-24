"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useAuth } from "@/hooks/useAuth"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/utils/password/password-schema"
import { PasswordField } from "../ui/password-field"
import { Loader2 } from "lucide-react"


const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
})


export function LoginForm() {
  const { login, isLoading } = useAuth();

  // Defines the form with Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: ""
    },
  })

  // Defines the submit handler (login hook)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await login(values);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
                <Input placeholder="" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <PasswordField />

        <div className="flex items-center justify-start">
          <Button   
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            {isLoading && <span className="ml-2">Please wait...</span>}
          </Button>
        </div>
    </form>
    </Form>
  )
}
