"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
      username: initialData?.username || "",
      phone: initialData?.phone || "",
      dateOfBirth: initialData?.dateOfBirth || undefined,
    },
  });

  const onSubmit = async (data: UserProfileOnboarding) => {
    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      onComplete(data);
    } catch (error) {
      console.error("Error submitting profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Osobné údaje</CardTitle>
        <CardDescription>
          Povedzte nám niečo o sebe, aby sme mohli prispôsobiť vašu skúsenosť.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celé meno *</FormLabel>
                  <FormControl>
                    <Input placeholder="Vaše celé meno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Používateľské meno *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="vase_meno123"
                      {...field}
                      onChange={(e) => {
                        // Convert to lowercase and remove spaces
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/\s/g, "_");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefónne číslo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+421 XXX XXX XXX"
                      type="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dátum narodenia *</FormLabel>
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
