import { useAppStore, type AppState } from "@/store/useAppStore";
import type { User } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getUsers(): Promise<User[]> {
  return simulateNetworkDelay(useAppStore.getState().users);
}

export function getJudges(): Promise<User[]> {
  return simulateNetworkDelay(useAppStore.getState().users.filter((u) => u.role === "judge"));
}

export function getContestants(): Promise<User[]> {
  return simulateNetworkDelay(
    useAppStore.getState().users.filter((u) => u.role === "contestant"),
  );
}

export function updateProfile(
  userId: string,
  updates: Parameters<AppState["updateProfile"]>[1],
): Promise<void> {
  useAppStore.getState().updateProfile(userId, updates);
  return simulateNetworkDelay(undefined);
}

export function deleteAccount(userId: string): Promise<void> {
  useAppStore.getState().deleteAccount(userId);
  return simulateNetworkDelay(undefined);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await useAppStore.getState().changePassword(userId, currentPassword, newPassword);
  return simulateNetworkDelay(result);
}

export function submitJudgeApplication(
  userId: string,
  input: Parameters<AppState["submitJudgeApplication"]>[1],
): Promise<void> {
  useAppStore.getState().submitJudgeApplication(userId, input);
  return simulateNetworkDelay(undefined);
}
