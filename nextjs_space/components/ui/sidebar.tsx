"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTheme } from "next-themes";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  // We can't easily use useTheme inside the motion component's animate prop directly if we want it to be reactive
  // without re-rendering the whole component tree or causing hydration mismatches.
  // However, we can use CSS variables for the background color if we move the logic to className or style,
  // but framer-motion animates inline styles.

  // A better approach for framer-motion with themes is to rely on CSS classes for the base colors
  // and only animate the width, OR pass the theme-aware colors.

  // Let's try to use the `className` for the background color and remove it from `animate`
  // IF we don't need to animate the color change itself (or if we can animate it via CSS).
  // But the original code animates between blue (open) and neutral (closed).

  // To keep the animation and support dark mode, we can use CSS variables that change value based on the class.
  // But framer-motion needs explicit values to interpolate.

  // Let's use `useTheme` here.
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const openColor = isDark ? "#137fec" : "#137fec"; // Blue is fine for both or maybe darker in dark mode? Let's keep blue.
  const closedColor = isDark ? "#18181b" : "#f5f5f5"; // zinc-900 vs neutral-100

  return (
    <div className="hidden lg:flex h-full flex-shrink-0">
      <motion.div
        className={cn("h-full px-4 py-4 flex flex-col", className)}
        animate={{
          width: animate ? (open ? "300px" : "80px") : "300px",
          backgroundColor: open ? openColor : closedColor,
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row lg:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        open
          ? "text-white hover:text-white/90"
          : "text-neutral-700 dark:text-neutral-200 hover:text-black",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const SidebarBrand = () => {
  const { open } = useSidebar();
  return (
    <div className="flex items-center gap-2 mb-8">
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex-shrink-0 transition-colors",
          open ? "bg-white" : "bg-[#137fec]"
        )}
      />
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        className={cn(
          "font-bold text-lg whitespace-pre",
          open ? "text-white" : "text-neutral-700 dark:text-white"
        )}
      >
        FlowPDV
      </motion.span>
    </div>
  );
};
