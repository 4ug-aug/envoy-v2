import { WrenchIcon, CheckIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { ToolCall } from "@/hooks/use-chat";

const MAX_ARGS_LEN = 300;

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const argsJson = truncate(JSON.stringify(toolCall.args, null, 2), MAX_ARGS_LEN);
  const isPending = toolCall.result === undefined;

  return (
    <Item size="sm" variant="muted">
      <ItemMedia variant="icon">
        <WrenchIcon />
      </ItemMedia>
      <ItemContent>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <ItemTitle className="cursor-pointer select-none hover:underline">
              {toolCall.toolName}
            </ItemTitle>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ItemDescription className="mt-1 font-mono text-xs line-clamp-none whitespace-pre-wrap">
              {argsJson}
            </ItemDescription>
            {toolCall.result !== undefined && (
              <ItemDescription className="mt-1 text-xs line-clamp-none break-all">
                {truncate(JSON.stringify(toolCall.result), MAX_ARGS_LEN)}
              </ItemDescription>
            )}
          </CollapsibleContent>
        </Collapsible>
      </ItemContent>
      <ItemActions>
        {isPending ? (
          <Spinner className="size-3.5 text-muted-foreground" />
        ) : (
          <CheckIcon className="size-3.5 text-green-500" />
        )}
      </ItemActions>
    </Item>
  );
}
