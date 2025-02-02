import { Button } from "./ui/button";

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
}

export function ActionButton({ onClick, icon, className }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={className ?? "h-10 w-10"}
    >
      {icon}
    </Button>
  );
} 