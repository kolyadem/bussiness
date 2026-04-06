export async function readApiPayload(response: Response) {
  try {
    return (await response.json()) as { error?: string; [key: string]: unknown };
  } catch {
    return {};
  }
}

export function getActionErrorMessage(_locale: string) {
  return "Не вдалося виконати дію. Спробуйте ще раз.";
}
