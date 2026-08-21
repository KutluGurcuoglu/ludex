import { useAppStore, type AppState } from "@/store/useAppStore";
import type { UserRole } from "@/types";
import { simulateNetworkDelay } from "./delay";

export async function login(
  email: string,
  password: string,
): Promise<Awaited<ReturnType<AppState["login"]>>> {
  const result = await useAppStore.getState().login(email, password);
  return simulateNetworkDelay(result);
}

export async function register(
  input: Parameters<AppState["register"]>[0],
): Promise<Awaited<ReturnType<AppState["register"]>>> {
  const result = await useAppStore.getState().register(input);
  return simulateNetworkDelay(result);
}

export function demoLogin(role: UserRole): Promise<void> {
  useAppStore.getState().demoLogin(role);
  return simulateNetworkDelay(undefined, 400, 700);
}

export function logout(): Promise<void> {
  useAppStore.getState().logout();
  return simulateNetworkDelay(undefined, 200, 400);
}

export function requestPasswordReset(
  channel: "email" | "phone",
  identifier: string,
): Promise<ReturnType<AppState["requestPasswordReset"]>> {
  const result = useAppStore.getState().requestPasswordReset(channel, identifier);
  return simulateNetworkDelay(result);
}

export async function resetPassword(
  code: string,
  newPassword: string,
): Promise<Awaited<ReturnType<AppState["resetPassword"]>>> {
  const result = await useAppStore.getState().resetPassword(code, newPassword);
  return simulateNetworkDelay(result);
}
