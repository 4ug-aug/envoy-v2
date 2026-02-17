import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WrenchIcon, Trash2Icon, PackageIcon, ZapIcon } from "lucide-react";
import type { CustomTool } from "../../api/tools/custom-store";
import { Spinner } from "./ui/spinner";

type BuiltInTool = { name: string; description: string };
type ToolsData = { builtIn: BuiltInTool[]; custom: CustomTool[] };

export function ToolsPanel() {
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState<ToolsData>({ builtIn: [], custom: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/v1/tools")
      .then((r) => r.json())
      .then((data: ToolsData) => setTools(data))
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (name: string) => {
    const res = await fetch(`/api/v1/tools/${name}`, { method: "DELETE" });
    if (res.ok) {
      setTools((prev) => ({ ...prev, custom: prev.custom.filter((t) => t.name !== name) }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open tools panel">
          <WrenchIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96">
        <SheetHeader>
          <SheetTitle>Tools</SheetTitle>
        </SheetHeader>

        {loading ? (
          <Spinner className="mx-auto my-4" />
        ) : (
          <Tabs defaultValue="builtin" className="p-2">
            <TabsList className="w-full">
              <TabsTrigger value="builtin" className="flex-1">
                Built-in ({tools.builtIn.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                Custom ({tools.custom.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builtin" className="space-y-2 overflow-y-auto max-h-[calc(100vh-10rem)]">
              {tools.builtIn.map((tool) => (
                <div key={tool.name} className="flex items-start gap-2 rounded-md border px-3 py-2">
                  <PackageIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="custom" className="space-y-2 overflow-y-auto">
              {tools.custom.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No custom tools yet. Ask the agent to create one.
                </p>
              ) : (
                tools.custom.map((tool) => (
                  <div key={tool.name} className="flex items-start gap-2 rounded-md border px-3 py-2">
                    <ZapIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={tool.enabled ? "default" : "secondary"} className="text-xs">
                        {tool.enabled ? "enabled" : "disabled"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tool.name)}
                        aria-label={`Delete ${tool.name}`}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
