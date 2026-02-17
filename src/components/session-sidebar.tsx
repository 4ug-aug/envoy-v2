import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type Session = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
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

type SessionSidebarProps = {
  sessions: Session[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
};

export function SessionSidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Button onClick={onNewChat} className="w-full" variant="outline" size="sm">
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  isActive={session.id === activeSessionId}
                  onClick={() => onSelectSession(session.id)}
                  className="flex items-center gap-2 pr-8"
                >
                  <span className="flex-1 truncate text-left">{session.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(session.updated_at)}
                  </span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  aria-label={`Delete ${session.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
