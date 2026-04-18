import { redirect } from "next/navigation";

export default function SignOutBridge() {
  redirect("/signout");
}