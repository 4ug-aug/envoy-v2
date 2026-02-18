import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PuzzleIcon, Trash2Icon, ChevronRightIcon, ZapIcon, SaveIcon } from "lucide-react";
import type { CustomTool } from "../../api/tools/custom-store";

type ConfigField = { key: string; label: string; required: boolean };

type IntegrationData = {
  id: string;
  name: string;
  description: string;
  config_schema: ConfigField[];
  enabled: number;
  tools: CustomTool[];
  configured: boolean;
  masked_values: Record<string, string | null>;
  created_at: number;
  updated_at: number;
};

export function IntegrationsPanel() {
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIntegrations = () => {
    setLoading(true);
    fetch("/api/v1/integrations")
      .then((r) => r.json())
      .then((data: IntegrationData[]) => setIntegrations(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    fetchIntegrations();
  }, [open]);

  const handleDelete = async (name: string) => {
    const res = await fetch(`/api/v1/integrations/${name}`, { method: "DELETE" });
    if (res.ok) {
      setIntegrations((prev) => prev.filter((i) => i.name !== name));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open integrations panel">
          <PuzzleIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96">
        <SheetHeader>
          <SheetTitle>Integrations</SheetTitle>
        </SheetHeader>

        {loading ? (
          <Spinner className="mx-auto my-4" />
        ) : integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center px-2">
            No integrations yet. Ask the agent to create one (e.g. "Create an Asana integration").
          </p>
        ) : (
          <div className="space-y-2 p-2 overflow-y-auto max-h-[calc(100vh-6rem)]">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onDelete={handleDelete}
                onConfigSaved={fetchIntegrations}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IntegrationCard({
  integration,
  onDelete,
  onConfigSaved,
}: {
  integration: IntegrationData;
  onDelete: (name: string) => void;
  onConfigSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-md border">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors">
            <ChevronRightIcon
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{integration.name}</p>
              <p className="text-xs text-muted-foreground truncate">{integration.description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-xs">
                {integration.tools.length} tool{integration.tools.length !== 1 ? "s" : ""}
              </Badge>
              <Badge
                variant={integration.configured ? "default" : "outline"}
                className={`text-xs ${integration.configured ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                {integration.configured ? "configured" : "needs setup"}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-3">
            {/* Tools list */}
            {integration.tools.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools</p>
                {integration.tools.map((tool) => (
                  <div key={tool.id} className="flex items-start gap-2 py-1">
                    <ZapIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        {integration.name}_{tool.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Config form */}
            {integration.config_schema.length > 0 && (
              <ConfigForm
                integrationName={integration.name}
                configSchema={integration.config_schema}
                maskedValues={integration.masked_values}
                onSaved={onConfigSaved}
              />
            )}

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(integration.name)}
            >
              <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />
              Delete Integration
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ConfigForm({
  integrationName,
  configSchema,
  maskedValues,
  onSaved,
}: {
  integrationName: string;
  configSchema: ConfigField[];
  maskedValues: Record<string, string | null>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const toSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value.trim()) toSave[key] = value;
    }
    if (Object.keys(toSave).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/integrations/${integrationName}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        setValues({});
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configuration</p>
      {configSchema.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label htmlFor={field.key} className="text-xs">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            id={field.key}
            type="password"
            placeholder={maskedValues[field.key] ?? "Not set"}
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
      ))}
      <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
        <SaveIcon className="h-3.5 w-3.5 mr-1.5" />
        {saving ? "Saving..." : "Save Credentials"}
      </Button>
    </div>
  );
}
