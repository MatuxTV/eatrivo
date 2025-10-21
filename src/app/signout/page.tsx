import { signOut } from "../../../auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export const metadata = {
  title: "Odhlásenie"
}

export default function SignOutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-primary-text">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Odhlásenie</CardTitle>
            <CardDescription>
              Naozaj sa chcete odhlásiť z Eatrivo?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/signin" })
              }}
              className="space-y-3"
            >
              <Button type="submit" variant="destructive" className="w-full bg-eatrivo-red hover:scale-105 hover:bg-eatrivo-red/60" size="lg">
                Áno, odhlásiť ma
              </Button>
            </form>
            <Button 
              variant="outline" 
              className="w-full hover:scale-105 hover:bg-gray-100" 
              size="lg"
              asChild
            >
              <a href="/dashboard">
                Zrušiť
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}