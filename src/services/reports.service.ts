import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Report, ReportStatus } from "@/types";
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

export function setReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  useAppStore.getState().setReportStatus(reportId, status);
  return simulateNetworkDelay(undefined);
}
