"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { passwordSchema } from "@/utils/password/password-schema";
import { PasswordField } from "../ui/password-field";
import { Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: passwordSchema,
  confirmPassword: passwordSchema,
});

export const RegisterForm = () => {
  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isValid, isDirty } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await register(values);
      navigate("/login", {
        state: { registrationSuccess: "Registration successful. Please login." },
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <Alert
            variant="destructive"
            className="border-red-500/50 text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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
        {/* Password Field */}
        <PasswordField />

        {/* Confirm Password Field */}
        <PasswordField title="Confirm Password" name="confirmPassword" />

        <div className="flex justify-center mt-8">
          <Button
            type="submit"
            disabled={isLoading || !isDirty || !isValid}
            className={`
                w-32 font-medium py-5 rounded-lg transition-all duration-200 
                ${
                isLoading || !isDirty || !isValid
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/20 shadow-lg"
                }
                text-white
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Wait...</span>
              </div>
            ) : (
              "Register"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
