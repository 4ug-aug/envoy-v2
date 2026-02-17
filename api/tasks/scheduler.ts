/**
 * Singleton cron scheduler managing scheduled task jobs.
 * Uses croner for lightweight cron scheduling.
 */

import { Cron } from "croner";
import { listEnabledTasks, type ScheduledTask } from "./store";
import { executeScheduledTask } from "./executor";

const jobs = new Map<string, Cron>();

export function scheduleTask(task: ScheduledTask): void {
  // Stop existing job if re-scheduling
  unscheduleTask(task.id);

  const job = new Cron(task.cron, () => {
    executeScheduledTask(task.id).catch((e) => {
      console.error(`[scheduler] Unhandled error in task "${task.name}":`, e);
    });
  });

  jobs.set(task.id, job);
  console.log(`[scheduler] Scheduled "${task.name}" with cron: ${task.cron}`);
}

export function unscheduleTask(taskId: string): void {
  const existing = jobs.get(taskId);
  if (existing) {
    existing.stop();
    jobs.delete(taskId);
  }
}

export function initScheduler(): void {
  const tasks = listEnabledTasks();
  console.log(`[scheduler] Initializing scheduled tasks... ${tasks.length} task(s) scheduled`);
  for (const task of tasks) {
    scheduleTask(task);
  }
}

export function stopAll(): void {
  for (const [id, job] of jobs) {
    job.stop();
  }
  jobs.clear();
  console.log("[scheduler] All scheduled tasks stopped");
}
