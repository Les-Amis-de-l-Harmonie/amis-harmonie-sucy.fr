import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary/12 text-primary",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/20 text-warning",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

const badgeDotVariants = cva("inline-block h-2 w-2 shrink-0 rounded-full", {
  variants: {
    variant: {
      primary: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
      muted: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "muted",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Rend un simple point plein (indicateur de notification, ex. onglet
   * « Idées » de la barre basse mobile) plutôt qu'un badge texte. Le contenu
   * de `children` est alors ignoré.
   */
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(badgeDotVariants({ variant }), className)}
        aria-hidden="true"
        {...props}
      />
    );
  }

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
Badge.displayName = "Badge";

export { Badge, badgeVariants };
