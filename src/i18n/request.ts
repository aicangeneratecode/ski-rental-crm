import { getRequestConfig } from "next-intl/server";
export default getRequestConfig(async () => ({
  locale: "ru",
  timeZone: "Europe/Belgrade",
  messages: (await import("../messages/ru.json")).default,
}));
