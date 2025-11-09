import type { JSX } from "solid-js";

import { I18nProvider as LinguiProvider } from "@lingui-solid/solid";
import { i18n } from "@lingui/core";

import { Language, Languages, type LocaleOptions } from "./Languages";
import { messages as ko } from "./catalogs/ko/messages";
import { initTime, loadTimeLocale } from "./dayjs";

export function I18nProvider(props: { children: JSX.Element }) {
  return <LinguiProvider i18n={i18n}>{props.children}</LinguiProvider>;
}

export { Languages, Language } from "./Languages";
export { useTime, timeLocale } from "./dayjs";
export { useError } from "./errors";

export async function loadAndSwitchLocale(
  key: Language,
  localeOptions: LocaleOptions,
) {
  if (key !== i18n.locale) {
    const data =
      Languages[key].i18n === "ko"
        ? ko
        : (await import(`./catalogs/${Languages[key].i18n}/messages.ts`))
            .messages;

    i18n.load({
      [key]: data,
    });

    i18n.activate(key);

    loadTimeLocale(Languages[key], localeOptions);
  }
}

/**
 * Preferred language as reported by the browser
 * @returns Preferred language
 */
export function browserPreferredLanguage() {
  const languages = Object.keys(Languages).map(
    (x) => [x, Languages[x as keyof typeof Languages]] as const,
  );

  // Get the user's system language. Check for exact
  // matches first, otherwise check for partial matches
  return Language.KOREAN;
}

/**
 * Initialise i18n engine
 */
export function initI18n() {
  i18n.load({
    ko,
  });

  i18n.activate("ko");

  initTime();
}

initI18n();
