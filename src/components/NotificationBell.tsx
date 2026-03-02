"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Bell, AlertTriangle, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { markNotificationRead, markAllNotificationsRead } from "@/db/mutations/budget-alerts";

type Notification = {
  id: string;
  user_id: string;
  budget_id: string;
  alert_type: "threshold_warning" | "over_budget";
  message: string;
  is_read: boolean;
  emailed: boolean;
  created_at: Date;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  const requestPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setPermissionState(perm);
    }
  }, []);

  useEffect(() => {
    if (permissionState === "granted" && unreadCount > 0) {
      const latest = notifications.find((n) => !n.is_read);
      if (latest) {
        new Notification("Flowdget Budget Alert", {
          body: latest.message,
          icon: "/favicon.ico",
          tag: `budget-alert-${latest.id}`,
        });
      }
    }
  }, [permissionState, unreadCount, notifications]);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-2">
            {permissionState === "default" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={requestPermission}
              >
                Enable push
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={handleMarkAllRead}
                disabled={isPending}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">
                Budget alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 ${
                  n.is_read ? "opacity-60" : "bg-muted/30"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {n.alert_type === "over_budget" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleMarkRead(n.id)}
                    disabled={isPending}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
