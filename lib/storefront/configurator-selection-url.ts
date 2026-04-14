/** URL builder for configurator product picker (standalone /configurator/select або вбудовано в /configurator?pick=). */

export type ConfiguratorPickerLocation = {
  pathname: "/configurator/select" | "/configurator";
  slotParam: "slot" | "pick";
};

export const CONFIGURATOR_SELECT_PAGE: ConfiguratorPickerLocation = {
  pathname: "/configurator/select",
  slotParam: "slot",
};

export const CONFIGURATOR_EMBED_PAGE: ConfiguratorPickerLocation = {
  pathname: "/configurator",
  slotParam: "pick",
};

export function buildConfiguratorSelectionHref(
  location: ConfiguratorPickerLocation,
  params: Record<string, string | string[] | undefined>,
  updates: Record<string, string | null | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (key in updates) {
      continue;
    }

    if (key === "pick" && location.slotParam === "slot") {
      continue;
    }

    if (key === "slot" && location.slotParam === "pick") {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value) {
          nextParams.append(key, value);
        }
      }
      continue;
    }

    if (rawValue) {
      nextParams.set(key, rawValue);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      continue;
    }

    const outKey = key === "slot" ? location.slotParam : key;
    nextParams.set(outKey, value);
  }

  const query = nextParams.toString();
  return query.length > 0 ? `${location.pathname}?${query}` : location.pathname;
}
