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

export interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
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
  /** Device / system safe area (Bot API 8.0+) */
  safeAreaInset?: TelegramSafeAreaInset;
  /** Content insets avoiding Telegram chrome (Bot API 8.0+) */
  contentSafeAreaInset?: TelegramSafeAreaInset;
  isFullscreen?: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  setHeaderColor?: (color: "bg_color" | "secondary_bg_color" | string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
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
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
  switchInlineQuery?: (query: string, choose_chat_types?: Array<"users" | "groups" | "channels" | "bots">) => void;
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

/**
 * Sync Telegram + device safe-area insets into CSS variables.
 * Top inset = system safe area + Telegram content chrome (header / status).
 */
export function applyTelegramSafeArea(wa: TelegramWebApp): void {
  const root = document.documentElement;
  const safe = wa.safeAreaInset;
  const content = wa.contentSafeAreaInset;

  const top = (safe?.top ?? 0) + (content?.top ?? 0);
  const bottom = Math.max(safe?.bottom ?? 0, content?.bottom ?? 0);
  const left = Math.max(safe?.left ?? 0, content?.left ?? 0);
  const right = Math.max(safe?.right ?? 0, content?.right ?? 0);

  root.style.setProperty("--tg-safe-top", `${top}px`);
  root.style.setProperty("--tg-safe-bottom", `${bottom}px`);
  root.style.setProperty("--tg-safe-left", `${left}px`);
  root.style.setProperty("--tg-safe-right", `${right}px`);
  root.style.setProperty(
    "--safe-top",
    `max(env(safe-area-inset-top, 0px), ${top}px)`,
  );
  root.style.setProperty(
    "--safe-bottom",
    `max(env(safe-area-inset-bottom, 0px), ${bottom}px)`,
  );
  root.dataset.tgFullscreen = wa.isFullscreen ? "1" : "0";
}

export function initTelegramApp(): TelegramWebApp | null {
  const wa = getTelegramWebApp();
  if (!wa) return null;
  try {
    wa.ready();
    wa.expand();
    applyTelegramTheme(wa);
    applyTelegramSafeArea(wa);
    wa.setHeaderColor?.(wa.themeParams.bg_color || "bg_color");
    wa.setBackgroundColor?.(wa.themeParams.bg_color || "#ffffff");

    const refreshSafeArea = () => applyTelegramSafeArea(wa);
    wa.onEvent?.("safeAreaChanged", refreshSafeArea);
    wa.onEvent?.("contentSafeAreaChanged", refreshSafeArea);
    wa.onEvent?.("fullscreenChanged", refreshSafeArea);
    wa.onEvent?.("viewportChanged", refreshSafeArea);
  } catch {
    // Local / unsupported version
  }
  return wa;
}

export function haptic(
  type: "light" | "success" | "error" | "selection" = "light",
  enabled = true,
): void {
  if (!enabled) return;
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

export function setClosingConfirmation(enabled: boolean): void {
  const wa = getTelegramWebApp();
  if (!wa) return;
  try {
    if (enabled) wa.enableClosingConfirmation?.();
    else wa.disableClosingConfirmation?.();
  } catch {
    /* ignore */
  }
}

/** Open a t.me / telegram.me link inside Telegram only. */
export function openTelegramLink(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "t.me" && host !== "telegram.me" && host !== "telegram.org") {
    console.warn("[dongbot] blocked non-Telegram link", host);
    return;
  }

  const wa = getTelegramWebApp();
  if (wa?.openTelegramLink) {
    wa.openTelegramLink(url);
    return;
  }
  if (wa?.openLink) {
    wa.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
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
