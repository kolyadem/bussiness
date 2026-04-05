export async function readApiPayload(response: Response) {
  try {
    return (await response.json()) as { error?: string; [key: string]: unknown };
  } catch {
    return {};
  }
}

export function getActionErrorMessage(locale: string) {
  if (locale === "uk") {
    return "Не вдалося виконати дію. Спробуйте ще раз.";
  }

  if (locale === "ru") {
    return "Не удалось выполнить действие. Попробуйте ещё раз.";
  }

  return "Could not complete the action. Please try again.";
}
