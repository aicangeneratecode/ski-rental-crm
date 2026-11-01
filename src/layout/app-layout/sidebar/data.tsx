import {
  BoxIcon,
  CalendarIcon,
  LayoutGridIcon,
  PluginIcon,
  UserCircleIcon,
} from "@/icons";
import type { NavItem } from "./types";
export const navItems: NavItem[] = [
  { key: "today", path: "/", icon: <LayoutGridIcon className="size-6" /> },
  {
    key: "bookings",
    path: "/bookings",
    icon: <CalendarIcon className="size-6" />,
  },
  {
    key: "equipment",
    path: "/equipment",
    icon: <BoxIcon className="size-6" />,
  },
  {
    key: "customers",
    path: "/customers",
    icon: <UserCircleIcon className="size-6" />,
  },
  {
    key: "settings",
    path: "/settings",
    icon: <PluginIcon className="size-6" />,
  },
];
export const othersItems: NavItem[] = [];
export const supportItems: NavItem[] = [];
