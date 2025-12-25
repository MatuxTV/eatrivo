import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "./routing";

const messagesLoaders = {
  sk: () => import("../../locales/sk.json").then((m) => m.default),
  en: () => import("../../locales/en.json").then((m) => m.default),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await messagesLoaders[locale](),
  };
});
