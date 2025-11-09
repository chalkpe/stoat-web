import { createSignal } from "solid-js";

import { i18n } from "@lingui/core";
import dayjs from "dayjs";
import dayjs_ko from "dayjs/esm/locale/ko.js";
import advancedFormat from "dayjs/plugin/advancedFormat";
import calendar from "dayjs/plugin/calendar";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";

import { type LocaleOptions, LanguageEntry, Languages } from "./Languages";

dayjs.extend(calendar);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(updateLocale);

/**
 * Internal signal, don't try to use this unless you know what you're doing!
 */
const [timeLocale, setTimeLocale] = createSignal<[string, ILocale]>([
  null!,
  null!,
]);

export { dayjs, timeLocale };

export async function loadTimeLocale(
  language: LanguageEntry,
  localeOptions: LocaleOptions,
  useLocale?: ILocale,
) {
  const target = language.dayjs ?? language.i18n;
  const locale =
    useLocale ??
    (target === "ko"
      ? dayjs_ko
      : ((await import(`../../node_modules/dayjs/esm/locale/${target}.js`).then(
          (module) => module.default,
        )) as ILocale));

  // merge options for calendar
  (locale as unknown as { calendar: Record<string, string> }).calendar = {
    lastDay: i18n._(`[어제] LT`),
    sameDay: i18n._(`[오늘] LT`),
    nextDay: i18n._(`[내일] LT`),
    lastWeek: i18n._(`[저번주] dddd LT`),
    nextWeek: i18n._(`[다음주] dddd LT`),
    sameElse: "L",
  };

  // merge locale options
  const options = {
    ...language.localeOptions,
    ...localeOptions,
  };

  updateTimeLocaleOptions(options, target, locale);
}

/**
 * Update dayjs locale given locale options
 * @param options Options
 * @param target Target locale (uses current if none specified)
 * @param useLocale Override locale data
 */
export function updateTimeLocaleOptions(
  options: LocaleOptions,
  target?: string,
  useLocale?: ILocale,
) {
  const [currentTarget, currentLocale] = timeLocale();
  target = target ?? currentTarget;
  useLocale = useLocale ?? currentLocale;

  const locale = {
    ...useLocale,
    formats: {
      ...useLocale.formats,
      L: options.dateFormat ?? useLocale.formats.L,
      LT: options.timeFormat ?? useLocale.formats.LT,
    },
  };

  setTimeLocale([target, locale]);
}

/**
 * Initialisation function
 */
export function initTime() {
  loadTimeLocale(Languages.ko, {}, dayjs_ko);
}

/**
 * Create dayjs time objects with locale and extensions
 * @returns Dayjs creator
 */
export function useTime() {
  // eslint-disable-next-line solid/reactivity
  return (date?: dayjs.ConfigType) => dayjs(date).locale(...timeLocale());
}
