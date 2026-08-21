import { useAppStore, type AppState } from "@/store/useAppStore";
import type { UserRole } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function login(
  email: string,
  password: string,
): Promise<ReturnType<AppState["login"]>> {
  const result = useAppStore.getState().login(email, password);
  return simulateNetworkDelay(result);
}

export function register(
  input: Parameters<AppState["register"]>[0],
): Promise<ReturnType<AppState["register"]>> {
  const result = useAppStore.getState().register(input);
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

export function resetPassword(
  code: string,
  newPassword: string,
): Promise<ReturnType<AppState["resetPassword"]>> {
  const result = useAppStore.getState().resetPassword(code, newPassword);
  return simulateNetworkDelay(result);
}
