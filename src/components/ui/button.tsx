import * as React from "react";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

const buttonVariantClasses = {
  default: "btn-primary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  success: "btn-success",
  danger: "btn-danger",
  export: "btn-export-excel",
  upload: "btn-upload",
  pdf: "btn-export-pdf",
} as const;

const buttonSizeClasses = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "!h-10 !w-10 !p-0",
} as const;

type ButtonVariant = keyof typeof buttonVariantClasses;
type ButtonSize = keyof typeof buttonSizeClasses;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      "btn",
      buttonVariantClasses[variant],
      buttonSizeClasses[size],
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = React.Children.only(
        children,
      ) as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
