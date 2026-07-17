import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, Shield, User, Settings, MessageSquare, Key } from "lucide-react";

interface AuditLog {
  id: number;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string | null;
  targetId: number | null;
  description: string;
  ipAddress: string | null;
  createdAt: string;
}

const actionIcons: Record<string, typeof Shield> = {
  user_create: User,
  user_update: User,
  user_delete: User,
  user_suspend: User,
  user_activate: User,
  password_reset: Key,
  settings_update: Settings,
  comment_hide: MessageSquare,
  comment_delete: MessageSquare,
  report_resolve: Shield,
};

const actionColors: Record<string, string> = {
  user_create: "text-emerald-400 bg-emerald-400/10",
  user_delete: "text-red-400 bg-red-400/10",
  user_suspend: "text-amber-400 bg-amber-400/10",
  user_activate: "text-sky-400 bg-sky-400/10",
  password_reset: "text-violet-400 bg-violet-400/10",
  settings_update: "text-cyan-400 bg-cyan-400/10",
  comment_hide: "text-orange-400 bg-orange-400/10",
  report_resolve: "text-green-400 bg-green-400/10",
};

function useAuditLogs(page: number) {
  return useQuery({
    queryKey: ["/api/admin/audit-logs", page],
    queryFn: () =>
      customFetch<{ items: AuditLog[]; total: number; page: number; limit: number }>(
        `/api/admin/audit-logs?page=${page}&limit=25`,
        { method: "GET" }
      ),
  });
}

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);
  const totalPages = Math.ceil((data?.total ?? 0) / 25);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white">سجل المراجعة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تتبع كل الإجراءات الإدارية على المنصة</p>
        </motion.div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-white/5" />
                ))}
              </div>
            ) : data?.items.length === 0 ? (
              <div className="text-center py-16">
                <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد سجلات بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {data?.items.map((log, i) => {
                  const Icon = actionIcons[log.action] ?? Shield;
                  const colorClass = actionColors[log.action] ?? "text-gray-400 bg-gray-400/10";
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-white/3 transition-colors"
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90">{log.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{log.actorName}</span>
                          {log.ipAddress && (
                            <span className="text-xs text-muted-foreground/60 font-mono">{log.ipAddress}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 text-left" dir="ltr">
                        <div>{new Date(log.createdAt).toLocaleDateString("ar-JO")}</div>
                        <div>{new Date(log.createdAt).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              صفحة {page} من {totalPages} • {data?.total} سجل
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
