/**
 * Глобальна українська локаль для Zod 4 (дефолтні повідомлення required/min/email/enum тощо).
 * Імпортуйте цей модуль один раз на процес до будь-якого `safeParse` / `parse`.
 */
import { z } from "zod";

z.config(z.locales.uk());
