import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text" | "card";
  size?: "sm" | "md" | "lg";
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variantClasses = {
      default: "rounded-md",
      circle: "rounded-full",
      text: cn(
        "rounded-full",
        size === "sm" && "h-3",
        size === "md" && "h-4",
        size === "lg" && "h-6"
      ),
      card: "rounded-xl",
    };

    return (
      <div
        ref={ref}
        className={cn("animate-pulse bg-muted", variantClasses[variant], className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showImage?: boolean;
  imageAspectRatio?: "video" | "square" | "wide" | "15/8";
  lines?: number;
  showFooter?: boolean;
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  (
    {
      className,
      showImage = true,
      imageAspectRatio = "15/8",
      lines = 3,
      showFooter = true,
      ...props
    },
    ref
  ) => {
    const aspectRatioClasses = {
      video: "aspect-video",
      square: "aspect-square",
      wide: "aspect-[21/9]",
      "15/8": "aspect-[15/8]",
    };

    return (
      <div
        ref={ref}
        className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}
        {...props}
      >
        {showImage && (
          <Skeleton
            variant="default"
            className={cn("w-full rounded-none", aspectRatioClasses[imageAspectRatio])}
          />
        )}
        <div className="p-5 space-y-4">
          <Skeleton variant="text" size="lg" className="w-3/4" />

          <Skeleton variant="text" size="sm" className="w-1/2" />

          <div className="space-y-2 pt-2">
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                size="md"
                className={cn(i === lines - 1 && "w-4/5")}
              />
            ))}
          </div>

          {showFooter && (
            <>
              <div className="border-t border-border pt-4 mt-4" />
              <div className="flex justify-between items-center">
                <Skeleton variant="text" size="sm" className="w-24" />
                <Skeleton variant="text" size="sm" className="w-16" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);
CardSkeleton.displayName = "CardSkeleton";

interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  showAvatar?: boolean;
  linesPerItem?: number;
  showDividers?: boolean;
}

const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
  (
    { className, count = 3, showAvatar = true, linesPerItem = 2, showDividers = true, ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("space-y-0", className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-4 py-4">
              {showAvatar && <Skeleton variant="circle" className="h-10 w-10 shrink-0" />}
              <div className="flex-1 space-y-2">
                {Array.from({ length: linesPerItem }).map((_, j) => (
                  <Skeleton
                    key={j}
                    variant="text"
                    size={j === 0 ? "md" : "sm"}
                    className={cn(j === 0 ? "w-3/4" : "w-1/2")}
                  />
                ))}
              </div>
            </div>
            {showDividers && i < count - 1 && <div className="border-t border-border" />}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
ListSkeleton.displayName = "ListSkeleton";

interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  paragraphs?: number;
  linesPerParagraph?: number;
  showHeading?: boolean;
  headingSize?: "h1" | "h2" | "h3";
}

const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
  (
    {
      className,
      paragraphs = 2,
      linesPerParagraph = 4,
      showHeading = true,
      headingSize = "h2",
      ...props
    },
    ref
  ) => {
    const headingClasses = {
      h1: "h-10 w-2/3",
      h2: "h-8 w-1/2",
      h3: "h-6 w-3/5",
    };

    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {showHeading && (
          <Skeleton variant="default" className={cn("rounded-lg", headingClasses[headingSize])} />
        )}

        {Array.from({ length: paragraphs }).map((_, pIndex) => (
          <div key={pIndex} className="space-y-2">
            {Array.from({ length: linesPerParagraph }).map((_, lIndex) => (
              <Skeleton
                key={lIndex}
                variant="text"
                size="md"
                className={cn(
                  lIndex === linesPerParagraph - 1 && pIndex === paragraphs - 1 && "w-4/5"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);
TextSkeleton.displayName = "TextSkeleton";

interface ImageSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  aspectRatio?: "square" | "video" | "wide" | "portrait" | "auto";
  customAspectRatio?: string;
  showIcon?: boolean;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

const ImageSkeleton = React.forwardRef<HTMLDivElement, ImageSkeletonProps>(
  (
    {
      className,
      aspectRatio = "video",
      customAspectRatio,
      showIcon = true,
      rounded = "lg",
      ...props
    },
    ref
  ) => {
    const aspectRatioClasses = {
      square: "aspect-square",
      video: "aspect-video",
      wide: "aspect-[21/9]",
      portrait: "aspect-[3/4]",
      auto: "",
    };

    const roundedClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
    };

    const style = customAspectRatio ? { aspectRatio: customAspectRatio } : undefined;

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden bg-muted",
          aspectRatioClasses[aspectRatio],
          roundedClasses[rounded],
          className
        )}
        style={style}
        {...props}
      >
        <div className="absolute inset-0 animate-pulse bg-muted" />
        {showIcon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }
);
ImageSkeleton.displayName = "ImageSkeleton";

interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ className, rows = 5, columns = 4, showHeader = true, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showHeader && (
          <div className="flex gap-4 pb-4 border-b border-border">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                size="md"
                className={cn("flex-1", i === columns - 1 && "w-20 flex-none")}
              />
            ))}
          </div>
        )}
        <div className="space-y-0">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 py-4 border-b border-border last:border-0">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  variant="text"
                  size="sm"
                  className={cn("flex-1", colIndex === columns - 1 && "w-20 flex-none")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
TableSkeleton.displayName = "TableSkeleton";

export { Skeleton, CardSkeleton, ListSkeleton, TextSkeleton, ImageSkeleton, TableSkeleton };
export type {
  SkeletonProps,
  CardSkeletonProps,
  ListSkeletonProps,
  TextSkeletonProps,
  ImageSkeletonProps,
  TableSkeletonProps,
};
