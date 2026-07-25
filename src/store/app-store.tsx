"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DOMAIN_VERSION, createId, nowIso } from "@/domain";
import type {
  AppState,
  CurrencyCode,
  Expense,
  Group,
  JoinInviteResult,
  Locale,
  Member,
  User,
} from "@/domain/types";
import {
  LocalStorageRepository,
  createExpenseEntity,
  createGroupEntity,
  createMemberEntity,
  demoUser,
  emptyState,
  migrateAppState,
} from "@/lib/persistence/repository";
import type { InviteShellParams } from "@/lib/telegram/invite";
import {
  apiAddExpense,
  apiAddMember,
  apiCreateGroup,
  apiDeactivateMember,
  apiDeleteExpense,
  apiGetMe,
  apiJoinInvite,
  apiUpdateExpense,
  apiUpdateSettings,
  fetchHealth,
} from "@/lib/persistence/remote-api";
import {
  initTelegramApp,
  isTelegramEnvironment,
  readTelegramUser,
} from "@/lib/telegram/webapp";

type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "SET_USER"; user: User }
  | { type: "SET_LOCALE"; locale: Locale }
  | { type: "SET_SETTINGS"; settings: AppState["settings"] }
  | { type: "ADD_GROUP"; group: Group; members?: Member[] }
  | { type: "UPDATE_GROUP"; groupId: string; patch: Partial<Group> }
  | { type: "UPSERT_GROUP"; group: Group }
  | { type: "ADD_MEMBER"; member: Member }
  | { type: "UPDATE_MEMBER"; memberId: string; patch: Partial<Member> }
  | { type: "DEACTIVATE_MEMBER"; memberId: string }
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "UPDATE_EXPENSE"; expenseId: string; patch: Partial<Expense> }
  | { type: "DELETE_EXPENSE"; expenseId: string }
  | { type: "CLEAR_ALL" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_USER":
      return { ...state, currentUser: action.user };
    case "SET_LOCALE":
      return { ...state, settings: { ...state.settings, locale: action.locale } };
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "ADD_GROUP":
      return {
        ...state,
        groups: [action.group, ...state.groups.filter((g) => g.id !== action.group.id)],
        members: action.members
          ? [
              ...action.members,
              ...state.members.filter(
                (m) => !action.members!.some((n) => n.id === m.id),
              ),
            ]
          : state.members,
      };
    case "UPDATE_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, ...action.patch, updatedAt: nowIso() }
            : g,
        ),
      };
    case "UPSERT_GROUP": {
      const exists = state.groups.some((g) => g.id === action.group.id);
      return {
        ...state,
        groups: exists
          ? state.groups.map((g) =>
              g.id === action.group.id
                ? { ...g, ...action.group, updatedAt: nowIso() }
                : g,
            )
          : [action.group, ...state.groups],
      };
    }
    case "ADD_MEMBER":
      if (state.members.some((m) => m.id === action.member.id)) return state;
      return { ...state, members: [...state.members, action.member] };
    case "UPDATE_MEMBER":
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.memberId ? { ...m, ...action.patch } : m,
        ),
      };
    case "DEACTIVATE_MEMBER":
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.memberId ? { ...m, isActive: false } : m,
        ),
      };
    case "ADD_EXPENSE": {
      if (
        action.expense.clientRequestId &&
        state.expenses.some((e) => e.clientRequestId === action.expense.clientRequestId)
      ) {
        return state;
      }
      if (state.expenses.some((e) => e.id === action.expense.id)) {
        return {
          ...state,
          expenses: state.expenses.map((e) =>
            e.id === action.expense.id ? action.expense : e,
          ),
        };
      }
      return { ...state, expenses: [action.expense, ...state.expenses] };
    }
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expenseId
            ? { ...e, ...action.patch, updatedAt: nowIso() }
            : e,
        ),
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.expenseId),
      };
    case "CLEAR_ALL":
      return emptyState(state.currentUser);
    default:
      return state;
  }
}

interface AppStoreValue {
  state: AppState;
  hydrated: boolean;
  isDevMode: boolean;
  remoteMode: boolean;
  createGroup: (
    name: string,
    currency: CurrencyCode,
    firstMemberName?: string,
  ) => Promise<Group>;
  addMember: (groupId: string, name: string) => Promise<Member>;
  joinViaInvite: (
    inviteCode: string,
    shell?: InviteShellParams | null,
  ) => Promise<JoinInviteResult>;
  deactivateMember: (memberId: string) => Promise<void>;
  addExpense: (
    expense: Omit<Expense, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => Promise<Expense | null>;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  clearAll: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const repo = new LocalStorageRepository();

function userFromTelegram(): User {
  const tg = readTelegramUser();
  if (!tg) return demoUser();
  return {
    id: `tg_${tg.id}`,
    telegramId: tg.id,
    firstName: tg.first_name,
    lastName: tg.last_name,
    username: tg.username,
    languageCode: tg.language_code,
    photoUrl: tg.photo_url,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [remoteMode, setRemoteMode] = useState(false);
  const remoteRef = useRef(false);
  const persistReady = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      initTelegramApp();
      const inTg = isTelegramEnvironment();
      setIsDevMode(!inTg);

      const user = userFromTelegram();
      const health = await fetchHealth();
      const useRemote = health.mongoConfigured;

      if (cancelled) return;
      remoteRef.current = useRemote;
      setRemoteMode(useRemote);

      if (useRemote) {
        try {
          const me = await apiGetMe();
          if (cancelled) return;
          dispatch({
            type: "HYDRATE",
            state: {
              version: DOMAIN_VERSION,
              currentUser: me.user,
              groups: me.groups,
              members: me.members,
              expenses: me.expenses,
              settings: me.settings,
            },
          });
          repo.save({
            version: DOMAIN_VERSION,
            currentUser: me.user,
            groups: me.groups,
            members: me.members,
            expenses: me.expenses,
            settings: me.settings,
          });
        } catch (err) {
          console.warn("[dongbot] remote hydrate failed, using cache", err);
          const loaded = repo.load();
          if (loaded) {
            dispatch({
              type: "HYDRATE",
              state: {
                ...migrateAppState(loaded),
                currentUser: loaded.currentUser ?? user,
              },
            });
          } else {
            dispatch({ type: "HYDRATE", state: emptyState(user) });
          }
        }
      } else {
        const loaded = repo.load();
        if (loaded) {
          const migrated = migrateAppState(loaded);
          dispatch({
            type: "HYDRATE",
            state: {
              ...migrated,
              currentUser: migrated.currentUser ?? user,
              settings: {
                ...migrated.settings,
                locale:
                  migrated.settings?.locale ??
                  (user.languageCode?.startsWith("fa")
                    ? "fa"
                    : migrated.settings?.locale || "fa"),
              },
            },
          });
        } else {
          const initial = emptyState(user);
          if (user.languageCode?.startsWith("en")) {
            initial.settings.locale = "en";
          }
          dispatch({ type: "HYDRATE", state: initial });
        }
      }

      if (!cancelled) {
        setHydrated(true);
        persistReady.current = true;
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !persistReady.current) return;
    // Always mirror to localStorage as cache; remote is source of truth when enabled.
    const result = repo.save(state);
    if (!result.ok && result.error !== "ssr") {
      console.warn("[dongbot] failed to persist state", result.error);
    }
  }, [state, hydrated]);

  const createGroup = useCallback(
    async (name: string, currency: CurrencyCode, firstMemberName?: string) => {
      if (remoteRef.current) {
        const bundle = await apiCreateGroup({ name, currency, firstMemberName });
        dispatch({ type: "ADD_GROUP", group: bundle.group, members: bundle.members });
        return bundle.group;
      }
      const userId = state.currentUser?.id ?? "anonymous";
      const group = createGroupEntity(name, currency, userId);
      const members: Member[] = [];
      if (firstMemberName?.trim()) {
        members.push(
          createMemberEntity(group.id, firstMemberName, {
            userId,
            telegramId: state.currentUser?.telegramId,
          }),
        );
      } else if (state.currentUser) {
        members.push(
          createMemberEntity(group.id, state.currentUser.firstName, {
            userId,
            telegramId: state.currentUser.telegramId,
          }),
        );
      }
      dispatch({ type: "ADD_GROUP", group, members });
      return group;
    },
    [state.currentUser],
  );

  const addMember = useCallback(async (groupId: string, name: string) => {
    if (remoteRef.current) {
      const member = await apiAddMember(groupId, name);
      dispatch({ type: "ADD_MEMBER", member });
      return member;
    }
    const member = createMemberEntity(groupId, name);
    dispatch({ type: "ADD_MEMBER", member });
    return member;
  }, []);

  const joinViaInvite = useCallback(
    async (
      inviteCode: string,
      shell?: InviteShellParams | null,
    ): Promise<JoinInviteResult> => {
      const code = inviteCode.trim().toLowerCase();
      if (!code) return { status: "invalid" };

      if (remoteRef.current) {
        const result = await apiJoinInvite(code);
        if (result.status === "invalid") return { status: "invalid" };
        dispatch({ type: "UPSERT_GROUP", group: result.group });
        dispatch({ type: "ADD_MEMBER", member: result.member });
        return {
          status: result.status,
          group: result.group,
          memberId: result.memberId,
        };
      }

      let group = state.groups.find((g) => g.inviteCode === code);

      if (!group && shell && shell.groupId) {
        group = {
          id: shell.groupId,
          name: shell.name,
          currency: shell.currency,
          createdBy: state.currentUser?.id ?? "invite",
          createdAt: nowIso(),
          updatedAt: nowIso(),
          inviteCode: code,
        };
        dispatch({ type: "UPSERT_GROUP", group });
      }

      if (!group) return { status: "invalid" };

      const user = state.currentUser;
      const existing = state.members.find(
        (m) =>
          m.groupId === group!.id &&
          m.isActive &&
          ((user?.telegramId && m.telegramId === user.telegramId) ||
            (user?.id && m.userId === user.id)),
      );
      if (existing) {
        return { status: "already_member", group, memberId: existing.id };
      }

      const displayName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ")
        : "Member";
      const member = createMemberEntity(group.id, displayName, {
        userId: user?.id,
        telegramId: user?.telegramId,
      });
      dispatch({ type: "ADD_MEMBER", member });
      return { status: "joined", group, memberId: member.id };
    },
    [state.groups, state.members, state.currentUser],
  );

  const deactivateMember = useCallback(async (memberId: string) => {
    if (remoteRef.current) {
      await apiDeactivateMember(memberId);
    }
    dispatch({ type: "DEACTIVATE_MEMBER", memberId });
  }, []);

  const addExpense = useCallback(
    async (
      input: Omit<Expense, "id" | "createdAt" | "updatedAt"> & { id?: string },
    ) => {
      const clientRequestId = input.clientRequestId ?? createId("req");
      if (remoteRef.current) {
        const expense = await apiAddExpense(input.groupId, {
          description: input.description,
          amount: input.amount,
          currency: input.currency,
          payerId: input.payerId,
          splitType: input.splitType,
          participantIds: input.participantIds,
          shares: input.shares,
          payerIncluded: input.payerIncluded,
          note: input.note,
          clientRequestId,
        });
        dispatch({ type: "ADD_EXPENSE", expense });
        return expense;
      }

      const expense = createExpenseEntity({
        ...input,
        clientRequestId,
      });
      const dup =
        expense.clientRequestId &&
        state.expenses.some((e) => e.clientRequestId === expense.clientRequestId);
      if (dup) return null;
      dispatch({ type: "ADD_EXPENSE", expense });
      return expense;
    },
    [state.expenses],
  );

  const updateExpense = useCallback(
    async (expenseId: string, patch: Partial<Expense>) => {
      if (remoteRef.current) {
        const expense = await apiUpdateExpense(expenseId, {
          description: patch.description,
          amount: patch.amount,
          currency: patch.currency,
          payerId: patch.payerId,
          splitType: patch.splitType,
          participantIds: patch.participantIds,
          shares: patch.shares,
          payerIncluded: patch.payerIncluded,
          note: patch.note,
        });
        dispatch({
          type: "UPDATE_EXPENSE",
          expenseId,
          patch: expense,
        });
        return;
      }
      dispatch({ type: "UPDATE_EXPENSE", expenseId, patch });
    },
    [],
  );

  const deleteExpense = useCallback(async (expenseId: string) => {
    if (remoteRef.current) {
      await apiDeleteExpense(expenseId);
    }
    dispatch({ type: "DELETE_EXPENSE", expenseId });
  }, []);

  const setLocale = useCallback(async (locale: Locale) => {
    dispatch({ type: "SET_LOCALE", locale });
    if (remoteRef.current) {
      try {
        const settings = await apiUpdateSettings({ locale });
        dispatch({ type: "SET_SETTINGS", settings });
      } catch (err) {
        console.warn("[dongbot] failed to sync locale", err);
      }
    }
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
    if (!remoteRef.current) {
      repo.clear();
    }
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      isDevMode,
      remoteMode,
      createGroup,
      addMember,
      joinViaInvite,
      deactivateMember,
      addExpense,
      updateExpense,
      deleteExpense,
      setLocale,
      clearAll,
    }),
    [
      state,
      hydrated,
      isDevMode,
      remoteMode,
      createGroup,
      addMember,
      joinViaInvite,
      deactivateMember,
      addExpense,
      updateExpense,
      deleteExpense,
      setLocale,
      clearAll,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}

export function useLocale(): Locale {
  return useAppStore().state.settings.locale;
}
