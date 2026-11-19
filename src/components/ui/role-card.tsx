'use client'
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from "@/store/useApp";
import { ArrowRight, ShieldCheck, Truck, Boxes, FileText, ReceiptText } from 'lucide-react';
import { GlassCard } from "@/components/ui/glass-card";
import { ROLES, ROLE_DESC } from "@/lib/auth";

const ICON: Record<string, React.ComponentType<{ className?: string }>> = { A: ShieldCheck, G: Truck, Y: Boxes, D: FileText, B: ReceiptText };

/** One role on the landing page, built on the same glass card as sign-in. */
export function RoleCard({ k }: { k: string }) {
  const Icon = ICON[k], signIn = useApp((s) => s.signIn);
  return (
    // jump straight into the terminal with this role (demo, no account)
    <Link to="/dashboard" onClick={() => signIn(k, null)} className="block group/role h-full">
      <GlassCard className="h-full" bodyClassName="p-5 min-h-[190px] flex flex-col" range={140} rotate={7}>
        <div className="flex flex-col h-full min-h-[150px]">
          <Icon className="w-7 h-7 text-lime-300 mb-3" />
          <h3 className="text-[22px] font-medium text-white leading-tight" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{ROLES[k]}</h3>
          <p className="text-sm text-white/65 mt-1 leading-snug">{ROLE_DESC[k]}</p>
          <span className="mt-auto pt-4 text-[13px] font-semibold text-lime-300 flex items-center gap-1.5">
            Enter as {ROLES[k]}
            <ArrowRight className="w-3.5 h-3.5 group-hover/role:translate-x-1 transition-transform duration-300" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
