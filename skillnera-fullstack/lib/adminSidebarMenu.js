import { AiOutlineDashboard } from "react-icons/ai";
import { BiCategory } from "react-icons/bi";
import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineShoppingBag } from "react-icons/md";
import { LuUserRound } from "react-icons/lu";
import { IoMdStarOutline } from "react-icons/io";
import { MdOutlinePermMedia } from "react-icons/md";
import { RiCoupon2Line, RiShareForwardLine, RiSettings3Line, RiFileUserLine } from "react-icons/ri";
import { MdSupportAgent } from "react-icons/md";

import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_SHOW,
  ADMIN_COUPON_ADD,
  ADMIN_COUPON_SHOW,
  ADMIN_CUSTOMERS_SHOW,
  ADMIN_DASHBOARD,
  ADMIN_MEDIA_SHOW,
  ADMIN_ORDER_SHOW,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_SHOW,
  ADMIN_PRODUCT_VARIANT_ADD,
  ADMIN_PRODUCT_VARIANT_SHOW,
  ADMIN_REVIEW_SHOW,
  ADMIN_MLM_COMMISSIONS,
  ADMIN_MLM_SETTINGS,
  ADMIN_MLM_TREE,
  ADMIN_KYC_SHOW,
  ADMIN_SUPPORT_SHOW,
} from "@/routes/AdminPanelRoute";

export const adminAppSidebarMenu = [
  { title: "Dashboard", url: ADMIN_DASHBOARD, icon: AiOutlineDashboard, roles: ["admin"] },
  {
    title: "Category",
    url: "#",
    icon: BiCategory,
    roles: ["admin"],
    submenu: [
      { title: "Add Category", url: ADMIN_CATEGORY_ADD, roles: ["admin"] },
      { title: "All Category", url: ADMIN_CATEGORY_SHOW, roles: ["admin"] },
    ],
  },
  {
    title: "Products",
    url: "#",
    icon: IoShirtOutline,
    roles: ["admin"],
    submenu: [
      { title: "Add Product", url: ADMIN_PRODUCT_ADD, roles: ["admin"] },
      { title: "Add Variant", url: ADMIN_PRODUCT_VARIANT_ADD, roles: ["admin"] },
      { title: "All Products", url: ADMIN_PRODUCT_SHOW, roles: ["admin"] },
      { title: "Product Variants", url: ADMIN_PRODUCT_VARIANT_SHOW, roles: ["admin"] },
    ],
  },
  {
    title: "Coupons",
    url: "#",
    icon: RiCoupon2Line,
    roles: ["admin"],
    submenu: [
      { title: "Add Coupon", url: ADMIN_COUPON_ADD, roles: ["admin"] },
      { title: "All Coupons", url: ADMIN_COUPON_SHOW, roles: ["admin"] },
    ],
  },
  { title: "Orders", url: ADMIN_ORDER_SHOW, icon: MdOutlineShoppingBag, roles: ["admin"] },
  { title: "Customers", url: ADMIN_CUSTOMERS_SHOW, icon: LuUserRound, roles: ["admin"] },
  { title: "Rating & Review", url: ADMIN_REVIEW_SHOW, icon: IoMdStarOutline, roles: ["admin"] },
  { title: "Media", url: ADMIN_MEDIA_SHOW, icon: MdOutlinePermMedia, roles: ["admin"] },
  {
    title: "MLM",
    url: "#",
    icon: RiShareForwardLine,
    roles: ["admin"],
    submenu: [
      { title: "Commissions", url: ADMIN_MLM_COMMISSIONS, roles: ["admin"] },
      { title: "Settings", url: ADMIN_MLM_SETTINGS, roles: ["admin"] },
    ],
  },
  { title: "Referral Tree", url: ADMIN_MLM_TREE, roles: ["admin"] },
  { title: "KYC", url: ADMIN_KYC_SHOW, icon: RiFileUserLine, roles: ["admin"] },

  // Visible to both admin and support
  { title: "Supports", url: ADMIN_SUPPORT_SHOW, icon: MdSupportAgent, roles: ["admin", "support"] },
];

// helper to filter menu by role
export function getAdminSidebarMenuByRole(role) {
  if (!role) return adminAppSidebarMenu;
  return adminAppSidebarMenu
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      submenu: item.submenu
        ? item.submenu.filter((s) => !s.roles || s.roles.includes(role))
        : undefined,
    }));
}
