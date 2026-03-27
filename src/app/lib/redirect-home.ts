import { redirect } from "next/navigation";

type SearchParamValue = string | string[] | undefined;

export async function redirectToHome(
  searchParams: Promise<Record<string, SearchParamValue>>,
) {
  const query = await searchParams;
  const nextSearch = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextSearch.append(key, entry));
    } else if (typeof value === "string") {
      nextSearch.set(key, value);
    }
  }

  const suffix = nextSearch.toString();
  redirect(`/home${suffix ? `?${suffix}` : ""}`);
}