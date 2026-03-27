import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
} from "./routing";

const messagesLoaders = {
  sk: () => import("../../locales/sk.json").then((m) => m.default),
  en: () => import("../../locales/en.json").then((m) => m.default),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  let locale = isLocale(requested) ? requested : undefined;

  // For non-locale routes (app shell), prefer the locale resolved in middleware.
  if (!locale) {
    const headerStore = await headers();
    const headerLocale = headerStore.get(LOCALE_HEADER_NAME);
    locale = isLocale(headerLocale) ? headerLocale : undefined;
  }

  // Fallback for redirected requests where middleware persisted locale in a cookie.
  if (!locale) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  }

  return {
    locale,
    messages: await messagesLoaders[locale](),
  };
});
