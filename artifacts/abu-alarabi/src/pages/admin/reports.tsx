import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import { MessageSquareWarning, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface Report {
  id: number;
  reason: string;
  description: string | null;
  reporterName: string;
  contentType: string;
  commentText: string;
  status: string;
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  inappropriate: "محتوى غير لائق",
  spam: "سبام",
  wrong_info: "معلومات خاطئة",
  contact_sharing: "مشاركة بيانات تواصل",
  harassment: "تحرش أو إساءة",
};

function useReports(page: number, status?: string) {
  const qs = new URLSearchParams({ page: String(page), ...(status ? { status } : {}) }).toString();
  return useQuery({
    queryKey: ["/api/admin/reports", page, status],
    queryFn: () => customFetch<{ items: Report[]; total: number; page: number; limit: number }>(`/api/admin/reports?${qs}`, { method: "GET" }),
  });
}

export default function AdminReports() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const qc = useQueryClient();
  const { data, isLoading } = useReports(page, statusFilter);

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      customFetch(`/api/admin/reports/${id}/resolve`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/reports"] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">البلاغات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">مراجعة التعليقات المبلّغ عنها</p>
          </div>
          <div className="flex gap-2">
            {["pending", "resolved", "dismissed"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusFilter === s ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"}`}
              >
                {{ pending: "قيد الانتظار", resolved: "تمت المعالجة", dismissed: "مرفوض" }[s]}
              </button>
            ))}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquareWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد بلاغات في هذه الفئة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.items.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
                            {reasonLabels[report.reason] ?? report.reason}
                          </span>
                          <span className="text-xs text-muted-foreground">{report.reporterName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString("ar-JO")}</span>
                        </div>
                        <blockquote className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/70 italic line-clamp-3">
                          "{report.commentText}"
                        </blockquote>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-2">سبب البلاغ: {report.description}</p>
                        )}
                      </div>
                      {report.status === "pending" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => resolve.mutate({ id: report.id, action: "hide_content" })}
                            disabled={resolve.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            إخفاء التعليق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolve.mutate({ id: report.id, action: "dismiss" })}
                            disabled={resolve.isPending}
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1 text-xs"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            رفض البلاغ
                          </Button>
                        </div>
                      )}
                      {report.status !== "pending" && (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ${report.status === "resolved" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-300"}`}>
                          {{ resolved: "تمت المعالجة", dismissed: "مرفوض" }[report.status] ?? report.status}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-white/10 bg-white/5 text-white">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/10 bg-white/5 text-white">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
