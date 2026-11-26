"use client";

import { createContext } from "react";

/** Whether the desktop sidebar is collapsed (icons only). False everywhere else. */
export const SidebarCollapsedContext = createContext(false);
