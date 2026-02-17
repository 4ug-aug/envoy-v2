import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClockIcon, Trash2Icon, ChevronDownIcon, ChevronRightIcon, WrenchIcon } from "lucide-react";
import { Spinner } from "./ui/spinner";

type OutputStep =
  | { role: "assistant"; content?: string; toolCalls?: { toolName: string; args: Record<string, unknown> }[] }
  | { role: "tool"; results: { toolName: string; result: string }[] };

type TaskRun = {
  id: string;
  task_id: string;
  status: "running" | "success" | "error";
  result: string | null;
  output: OutputStep[] | null;
  started_at: number;
  finished_at: number | null;
};

type ScheduledTaskWithRun = {
  id: string;
  name: string;
  description: string;
  cron: string;
  enabled: number;
  created_at: number;
  updated_at: number;
  lastRun: TaskRun | null;
};

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RunStatusBadge({ run }: { run: TaskRun | null }) {
  if (!run) {
    return <Badge variant="outline" className="text-xs">Never run</Badge>;
  }

  switch (run.status) {
    case "success":
      return (
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 text-xs">
          Success
        </Badge>
      );
    case "error":
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    case "running":
      return (
        <Badge variant="secondary" className="text-xs animate-pulse">
          Running
        </Badge>
      );
  }
}

function RunOutput({ run }: { run: TaskRun }) {
  // If we have structured output, render it with tool calls
  if (run.output && run.output.length > 0) {
    return (
      <div className="mt-1 space-y-1.5 max-h-60 overflow-y-auto">
        {run.output.map((step, i) => {
          if (step.role === "assistant" && step.toolCalls && step.toolCalls.length > 0) {
            return (
              <div key={i} className="space-y-1">
                {step.toolCalls.map((tc, j) => (
                  <div key={j} className="flex items-start gap-1.5 text-xs">
                    <WrenchIcon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="font-medium text-muted-foreground">{tc.toolName}</span>
                      <pre className="bg-muted rounded px-1.5 py-1 mt-0.5 overflow-x-auto whitespace-pre-wrap text-[11px]">
                        {JSON.stringify(tc.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
                {step.content && (
                  <p className="text-xs whitespace-pre-wrap">{step.content}</p>
                )}
              </div>
            );
          }
          if (step.role === "assistant" && step.content) {
            return <p key={i} className="text-xs whitespace-pre-wrap">{step.content}</p>;
          }
          if (step.role === "tool") {
            return (
              <div key={i} className="space-y-1">
                {step.results.map((r, j) => (
                  <pre key={j} className="text-[11px] bg-muted rounded px-1.5 py-1 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                    <code>{r.result}</code>
                  </pre>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback: show plain result text
  if (run.result) {
    return (
      <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
        <code>{run.result}</code>
      </pre>
    );
  }

  return null;
}

export function TasksPanel() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<ScheduledTaskWithRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/v1/tasks")
      .then((r) => r.json())
      .then((data: { tasks: ScheduledTaskWithRun[] }) => setTasks(data.tasks))
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (name: string) => {
    const res = await fetch(`/api/v1/tasks/${name}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.name !== name));
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedRun((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open tasks panel">
          <CalendarClockIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96">
        <SheetHeader>
          <SheetTitle>Scheduled Tasks</SheetTitle>
        </SheetHeader>

        {loading ? (
          <Spinner className="mx-auto my-4" />
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center px-2">
            No scheduled tasks yet. Ask the agent to create one.
          </p>
        ) : (
          <div className="space-y-2 p-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-md border px-3 py-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(task.name)}
                    aria-label={`Delete ${task.name}`}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{task.cron}</code>
                  <Badge variant={task.enabled ? "default" : "secondary"} className="text-xs">
                    {task.enabled ? "enabled" : "disabled"}
                  </Badge>
                  <RunStatusBadge run={task.lastRun} />
                  {task.lastRun && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(task.lastRun.started_at)}
                    </span>
                  )}
                </div>

                {task.lastRun && (task.lastRun.output || task.lastRun.result) && (
                  <div>
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedRun === task.id ? (
                        <ChevronDownIcon className="h-3 w-3" />
                      ) : (
                        <ChevronRightIcon className="h-3 w-3" />
                      )}
                      Last run output
                    </button>
                    {expandedRun === task.id && <RunOutput run={task.lastRun} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
