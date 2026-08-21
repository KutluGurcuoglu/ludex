import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Report } from "@/types";
import { simulateNetworkDelay } from "./delay";

export function getReports(): Promise<Report[]> {
  return simulateNetworkDelay(useAppStore.getState().reports);
}

export function submitReport(input: Parameters<AppState["addReport"]>[0]): Promise<Report> {
  const created = useAppStore.getState().addReport(input);
  return simulateNetworkDelay(created);
}

export function assignReports(reportIds: string[], judgeId: string): Promise<void> {
  useAppStore.getState().assignReports(reportIds, judgeId);
  return simulateNetworkDelay(undefined);
}

export function unassignJudge(reportId: string, judgeId: string): Promise<void> {
  useAppStore.getState().unassignJudge(reportId, judgeId);
  return simulateNetworkDelay(undefined);
}
