import { redirectToHome } from "@/app/lib/redirect-home";

export default async function DashboardRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await redirectToHome(searchParams);
}
