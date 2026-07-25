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
import { createId, nowIso } from "@/domain";
import type {
  AppState,
  CurrencyCode,
  Expense,
  Group,
  Locale,
  Member,
  User,
} from "@/domain/types";
import {
  LocalStorageRepository,
  createExpenseEntity,
  createGroupEntity,
  createMemberEntity,
  createSampleState,
  demoUser,
  emptyState,
} from "@/lib/persistence/repository";
import {
  initTelegramApp,
  isTelegramEnvironment,
  readTelegramUser,
} from "@/lib/telegram/webapp";

type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "SET_USER"; user: User }
  | { type: "SET_LOCALE"; locale: Locale }
  | { type: "SET_CURRENCY_DEFAULT"; currency: CurrencyCode }
  | { type: "ADD_GROUP"; group: Group; members?: Member[] }
  | { type: "UPDATE_GROUP"; groupId: string; patch: Partial<Group> }
  | { type: "ADD_MEMBER"; member: Member }
  | { type: "UPDATE_MEMBER"; memberId: string; patch: Partial<Member> }
  | { type: "DEACTIVATE_MEMBER"; memberId: string }
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "UPDATE_EXPENSE"; expenseId: string; patch: Partial<Expense> }
  | { type: "DELETE_EXPENSE"; expenseId: string }
  | { type: "RESET_SAMPLE" }
  | { type: "CLEAR_ALL" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_USER":
      return { ...state, currentUser: action.user };
    case "SET_LOCALE":
      return { ...state, settings: { ...state.settings, locale: action.locale } };
    case "SET_CURRENCY_DEFAULT":
      return { ...state, settings: { ...state.settings, currency: action.currency } };
    case "ADD_GROUP":
      return {
        ...state,
        groups: [action.group, ...state.groups],
        members: action.members
          ? [...state.members, ...action.members]
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
    case "ADD_MEMBER":
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
    case "RESET_SAMPLE":
      return createSampleState(state.currentUser ?? demoUser());
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
  createGroup: (name: string, currency: CurrencyCode, firstMemberName?: string) => Group;
  addMember: (groupId: string, name: string) => Member;
  deactivateMember: (memberId: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Expense | null;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  setLocale: (locale: Locale) => void;
  resetSample: () => void;
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
  const persistReady = useRef(false);

  useEffect(() => {
    initTelegramApp();
    const inTg = isTelegramEnvironment();
    setIsDevMode(!inTg);

    const user = userFromTelegram();
    const loaded = repo.load();
    if (loaded) {
      dispatch({
        type: "HYDRATE",
        state: {
          ...loaded,
          currentUser: loaded.currentUser ?? user,
          settings: {
            ...loaded.settings,
            locale:
              loaded.settings?.locale ??
              (user.languageCode?.startsWith("fa") ? "fa" : loaded.settings?.locale || "fa"),
          },
        },
      });
    } else {
      const sample = createSampleState(user);
      if (!inTg && user.languageCode?.startsWith("en")) {
        sample.settings.locale = "en";
      }
      dispatch({ type: "HYDRATE", state: sample });
    }
    setHydrated(true);
    persistReady.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated || !persistReady.current) return;
    repo.save(state);
  }, [state, hydrated]);

  const createGroup = useCallback(
    (name: string, currency: CurrencyCode, firstMemberName?: string) => {
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

  const addMember = useCallback((groupId: string, name: string) => {
    const member = createMemberEntity(groupId, name);
    dispatch({ type: "ADD_MEMBER", member });
    return member;
  }, []);

  const deactivateMember = useCallback((memberId: string) => {
    dispatch({ type: "DEACTIVATE_MEMBER", memberId });
  }, []);

  const addExpense = useCallback(
    (input: Omit<Expense, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const expense = createExpenseEntity({
        ...input,
        clientRequestId: input.clientRequestId ?? createId("req"),
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

  const updateExpense = useCallback((expenseId: string, patch: Partial<Expense>) => {
    dispatch({ type: "UPDATE_EXPENSE", expenseId, patch });
  }, []);

  const deleteExpense = useCallback((expenseId: string) => {
    dispatch({ type: "DELETE_EXPENSE", expenseId });
  }, []);

  const setLocale = useCallback((locale: Locale) => {
    dispatch({ type: "SET_LOCALE", locale });
  }, []);

  const resetSample = useCallback(() => {
    dispatch({ type: "RESET_SAMPLE" });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      isDevMode,
      createGroup,
      addMember,
      deactivateMember,
      addExpense,
      updateExpense,
      deleteExpense,
      setLocale,
      resetSample,
      clearAll,
    }),
    [
      state,
      hydrated,
      isDevMode,
      createGroup,
      addMember,
      deactivateMember,
      addExpense,
      updateExpense,
      deleteExpense,
      setLocale,
      resetSample,
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
