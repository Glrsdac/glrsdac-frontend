"use client";

import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isRouteActive } from "@/lib/routeMatching";

interface PortalLayoutProps {
  title: string;
  description?: string;
  hideHeader?: boolean;
  navItems?: Array<{ to: string; label: string }>;
}

export function PortalLayout({
  title,
  description,
  hideHeader = false,
  navItems = [],
}: PortalLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl font-heading">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}

export function TreasuryPortalSection() {
  const navItems = [
    { to: "/portal/treasury/dashboard", label: "Dashboard" },
    { to: "/portal/treasury/sabbath", label: "Sessions" },
    { to: "/portal/treasury/contributions", label: "Contributions" },
    { to: "/portal/treasury/funds", label: "Funds" },
    { to: "/portal/treasury/expenses", label: "Expenses" },
    { to: "/portal/treasury/payments", label: "Payments" },
    { to: "/portal/treasury/bank-accounts", label: "Bank Accounts" },
    { to: "/portal/treasury/statements", label: "Statements" },
    { to: "/portal/treasury/automated-returns", label: "Returns" },
    { to: "/portal/treasury/cheques", label: "Cheques" },
    { to: "/portal/treasury/imprest", label: "Imprest" },
    { to: "/portal/treasury/dayborn-contributions", label: "Dayborn" },
  ];

  return <PortalLayout title="Treasurer Portal" description="Treasury workflows: contributions, returns, banking, and reporting." hideHeader navItems={navItems} />;
}

export function ClerkPortalSection() {
  return <PortalLayout title="Clerk Portal" description="Membership registry and clerk administration workflows." hideHeader />;
}

export function DepartmentPortalSection() {
  return <PortalLayout title="Department Portal" description="Department operations, collaboration, and resource management." hideHeader />;
}

export function MemberPortalSection() {
  return <PortalLayout title="Member Portal" description="Member self-service, statements, dues, and engagement tools." hideHeader />;
}

export function GovernancePortalSection() {
  return <PortalLayout title="Governance Portal" description="Church board governance, policy oversight, and audit workflows." hideHeader />;
}

export default function PortalSections() {
  return <GovernancePortalSection />;
}
