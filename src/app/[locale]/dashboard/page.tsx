import { redirectToHome } from "@/app/lib/redirect-home";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardRedirectPage({ searchParams }: PageProps) {
  await redirectToHome(searchParams);
}