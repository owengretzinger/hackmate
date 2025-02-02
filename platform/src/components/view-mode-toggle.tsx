import { Button } from "./ui/button";
import { Eye, Code } from "lucide-react";
import { cn } from "~/lib/utils";

export type ViewMode = "preview" | "code";

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ToggleButton = ({ active, onClick, icon, children }: ToggleButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      "flex h-8 items-center gap-2 px-3 text-sm font-medium transition-colors",
      active
        ? "bg-background text-foreground shadow-sm hover:bg-background"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {icon}
    {children}
  </Button>
);

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-secondary p-1">
      <ToggleButton
        active={viewMode === "preview"}
        onClick={() => setViewMode("preview")}
        icon={<Eye className="h-4 w-4" />}
      >
        Preview
      </ToggleButton>
      <ToggleButton
        active={viewMode === "code"}
        onClick={() => setViewMode("code")}
        icon={<Code className="h-4 w-4" />}
      >
        Code
      </ToggleButton>
    </div>
  );
} 