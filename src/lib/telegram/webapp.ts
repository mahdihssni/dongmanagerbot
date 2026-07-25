/** Telegram WebApp types — minimal surface we use. Works offline without the SDK. */

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface WebAppInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: { id: number; type: string; title?: string; username?: string };
  start_param?: string;
  auth_date?: number;
  hash?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: WebAppInitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  showAlert?: (message: string, callback?: () => void) => void;
  showConfirm?: (message: string, callback?: (ok: boolean) => void) => void;
  openLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramEnvironment(): boolean {
  const wa = getTelegramWebApp();
  return Boolean(wa && (wa.initData || wa.initDataUnsafe?.user));
}

export function readTelegramUser(): TelegramUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function applyTelegramTheme(wa: TelegramWebApp): void {
  const root = document.documentElement;
  const tp = wa.themeParams;
  if (tp.bg_color) root.style.setProperty("--tg-bg", tp.bg_color);
  if (tp.text_color) root.style.setProperty("--tg-text", tp.text_color);
  if (tp.hint_color) root.style.setProperty("--tg-hint", tp.hint_color);
  if (tp.button_color) root.style.setProperty("--tg-button", tp.button_color);
  if (tp.button_text_color) root.style.setProperty("--tg-button-text", tp.button_text_color);
  if (tp.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", tp.secondary_bg_color);
  if (tp.destructive_text_color) {
    root.style.setProperty("--tg-destructive", tp.destructive_text_color);
  }
  root.dataset.colorScheme = wa.colorScheme;
}

export function initTelegramApp(): TelegramWebApp | null {
  const wa = getTelegramWebApp();
  if (!wa) return null;
  try {
    wa.ready();
    wa.expand();
    applyTelegramTheme(wa);
    wa.setHeaderColor?.(wa.themeParams.bg_color || "#ffffff");
    wa.setBackgroundColor?.(wa.themeParams.bg_color || "#ffffff");
  } catch {
    // Local / unsupported version
  }
  return wa;
}

export function haptic(
  type: "light" | "success" | "error" | "selection" = "light",
): void {
  const h = getTelegramWebApp()?.HapticFeedback;
  if (!h) return;
  try {
    if (type === "success" || type === "error") h.notificationOccurred(type);
    else if (type === "selection") h.selectionChanged();
    else h.impactOccurred("light");
  } catch {
    /* ignore */
  }
}

export function closeTelegramApp(): void {
  getTelegramWebApp()?.close();
}

export function confirmDestructive(
  message: string,
): Promise<boolean> {
  const wa = getTelegramWebApp();
  if (wa?.showConfirm) {
    return new Promise((resolve) => {
      wa.showConfirm!(message, (ok) => resolve(Boolean(ok)));
    });
  }
  return Promise.resolve(window.confirm(message));
}
