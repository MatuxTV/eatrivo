"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  userProfileOnboardingSchema,
  type UserProfileOnboarding,
} from "@/lib/schemas/user";

interface ProfileSetupProps {
  onComplete: (data: UserProfileOnboarding) => void;
  initialData?: UserProfileOnboarding | null; // Add this prop
}

export default function ProfileSetup({
  onComplete,
  initialData,
}: ProfileSetupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserProfileOnboarding>({
    resolver: zodResolver(userProfileOnboardingSchema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      dateOfBirth: initialData?.dateOfBirth || undefined,
    },
  });

  const onSubmit = async (data: UserProfileOnboarding) => {
    setIsSubmitting(true);
    try {
      onComplete({ ...data });
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error("Error submitting profile", error, {
        context: "ProfileSetup",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="text-black">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">Osobné údaje</CardTitle>
        <CardDescription className="text-sm md:text-base">
          Povedzte nám niečo o sebe, aby sme mohli prispôsobiť vašu skúsenosť.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 md:space-y-6"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">
                    Celé meno *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Vaše celé meno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">
                    Používateľské meno *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="vase_meno123"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/\s/g, "_");
                        field.onChange(value);
                      }}
                      onBlur={async (e) => {
                        field.onBlur?.();
                        const value = e.target.value;
                        if (!value || value.length < 3) return;
                        try {
                          const res = await fetch(
                            `/api/onboarding/check-username?username=${encodeURIComponent(
                              value
                            )}`
                          );
                          const data = await res.json();
                          if (data.exists) {
                            form.setError("username", {
                              type: "manual",
                              message: "Používateľské meno je už obsadené",
                            });
                          } else {
                            form.clearErrors("username");
                          }
                        } catch (err) {
                          logger.error("Error checking username", err, {
                            context: "ProfileSetup",
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">
                    Dátum narodenia *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value || ""}
                      onChange={(e) => {
                        field.onChange(e.target.value || undefined);
                      }}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ukladá sa..." : "Pokračovať"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
