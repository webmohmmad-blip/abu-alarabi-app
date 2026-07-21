import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 duration-200",
  {
    variants: {
      variant: {
        // ── Core variants ─────────────────────────────────────────────────
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25 hover:bg-secondary/90",
        // ghost: explicit text-foreground keeps text readable on any light surface
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",

        // ── Semantic variants ─────────────────────────────────────────────
        // success: green — for تفعيل, confirm, positive actions
        success:
          "bg-success text-success-foreground shadow-lg shadow-success/25 hover:bg-success/90",
        // warning: gold — for أرشفة, إلغاء النشر, caution actions
        // Uses dark text (#1F2937) because gold (#C79A2D) fails WCAG AA with white
        warning:
          "bg-accent text-[#1F2937] shadow-lg shadow-accent/20 hover:bg-accent/85",
        // neutral: muted surface — for إيقاف, secondary actions on light backgrounds
        neutral:
          "bg-muted text-foreground border border-border shadow-sm hover:bg-muted/70",

        // ── Specialised variants ──────────────────────────────────────────
        // glass: dark/image backgrounds only (Hero overlays, dark drawers)
        glass:
          "bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl hover:bg-white/30",
        // white: sits on a dark coloured background — e.g. dark Hero CTA
        white:
          "bg-white text-primary shadow-lg hover:bg-white/90",
        // accent: gold CTA
        accent:
          "bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4",
        lg: "h-14 rounded-2xl px-10 text-base",
        icon: "h-12 w-12",
        "icon-sm": "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
