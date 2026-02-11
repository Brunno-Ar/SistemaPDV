import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Calendar, Users } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role?: string;
  isCurrentUser?: boolean;
  currentUserLabel?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string; // Allow overrides
  onClick?: () => void;
}

export function UserCard({
  id: _id,
  name,
  email,
  createdAt,
  role,
  isCurrentUser,
  currentUserLabel = "Você",
  icon,
  footer,
  className,
  onClick,
}: UserCardProps) {
  const Icon = icon || (
    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "master":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "gerente":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "master":
        return "Master";
      case "gerente":
        return "Gerente";
      default:
        return "Caixa";
    }
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all duration-200 border-2 bg-white dark:bg-zinc-900 h-full relative",
        isCurrentUser
          ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-zinc-800 hover:shadow-md",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 w-full">
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {name}
                  </CardTitle>
                  {isCurrentUser && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                        {currentUserLabel}
                      </span>
                    </div>
                  )}
                  {role && (
                    <CardDescription className="flex items-center space-x-1 mt-1">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${getRoleBadgeColor(
                          role,
                        )}`}
                      >
                        {getRoleLabel(role)}
                      </span>
                    </CardDescription>
                  )}
                </div>
                {!isCurrentUser && (
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg opacity-80">
                    {Icon}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-4 w-4" />
            <span className="truncate">{email}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>Desde {new Date(createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
          {footer && <div className="pt-2">{footer}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
