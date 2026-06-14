"use client"

import { Shield, Users, Package, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type UserRole = "admin" | "operations" | "logistics" | "dept-manager"
export type LogisticsSubRole = "logistics-admin" | "packer" | "tracker"

interface RoleSelectorProps {
  selectedRole: UserRole
  onRoleChange: (role: UserRole) => void
  disabled?: boolean
}

const roles = [
  {
    id: "admin" as UserRole,
    label: "Admin",
    icon: Shield,
    description: "Full system management",
    color: "blue",
  },
  {
    id: "operations" as UserRole,
    label: "Operations",
    icon: Users,
    description: "Inventory operations",
    color: "emerald",
  },
  {
    id: "logistics" as UserRole,
    label: "Logistics",
    icon: Package,
    description: "Order fulfillment and tracking",
    color: "purple",
  },
  {
    id: "dept-manager" as UserRole,
    label: "Dept. Head",
    icon: UserCog,
    description: "Department performance overview",
    color: "orange",
  },
]

export function RoleSelector({ selectedRole, onRoleChange, disabled }: RoleSelectorProps) {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Role Tabs with Dividers - Square Design */}
        <div className="flex items-center bg-slate-900/50 rounded-lg px-4 py-2">
          {roles.map((role, index) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            
            return (
              <Tooltip key={role.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onRoleChange(role.id)}
                      disabled={disabled}
                      className={cn(
                        "flex items-center justify-center gap-2 px-6 py-2.5 font-medium text-sm transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isSelected
                          ? "text-blue-400"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                      aria-label={`Select ${role.label} role`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{role.label}</span>
                    </button>
                    {index < roles.length - 1 && (
                      <div className="h-6 w-px bg-slate-700" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-slate-600">
                  <p className="font-semibold text-white">{role.label}</p>
                  <p className="text-xs text-slate-300">{role.description}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        
        {/* Dynamic Role Description */}
        <div className="text-center animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <p className="text-sm text-slate-400">
            {roles.find(r => r.id === selectedRole)?.description}
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
