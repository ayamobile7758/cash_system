"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  PermissionAssignmentOption,
  PermissionBundleOption,
  PermissionUserOption
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";

type BundlePreviewResponse = {
  bundle_key: string;
  base_role: "admin" | "pos_staff";
  permissions: string[];
  max_discount_percentage: number | null;
  discount_requires_approval: boolean;
};

type AssignmentResponse = {
  assignment_id: string;
  bundle_key: string;
  base_role: "admin" | "pos_staff";
  is_active: boolean;
};

type PermissionsPanelProps = {
  permissionBundles: PermissionBundleOption[];
  permissionUsers: PermissionUserOption[];
  activeAssignments: PermissionAssignmentOption[];
};

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

export function PermissionsPanel({
  permissionBundles,
  permissionUsers,
  activeAssignments
}: PermissionsPanelProps) {
  const router = useRouter();
  const [selectedBundleKey, setSelectedBundleKey] = useState(permissionBundles[0]?.key ?? "");
  const [selectedUserId, setSelectedUserId] = useState(permissionUsers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<BundlePreviewResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedBundle = useMemo(
    () => permissionBundles.find((bundle) => bundle.key === selectedBundleKey) ?? null,
    [permissionBundles, selectedBundleKey]
  );

  const eligibleUsers = useMemo(() => {
    if (!selectedBundle) {
      return permissionUsers;
    }

    return permissionUsers.filter((user) => user.role === selectedBundle.base_role);
  }, [permissionUsers, selectedBundle]);

  const selectedUser = useMemo(
    () => eligibleUsers.find((user) => user.id === selectedUserId) ?? eligibleUsers[0] ?? null,
    [eligibleUsers, selectedUserId]
  );

  const selectedUserAssignments = useMemo(
    () => activeAssignments.filter((assignment) => assignment.user_id === selectedUser?.id),
    [activeAssignments, selectedUser]
  );

  async function runPreview() {
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/permissions/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bundle_key: selectedBundleKey })
        });

        const envelope = (await response.json()) as StandardEnvelope<BundlePreviewResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setPreview(envelope.data);
        toast.success("تم تحميل معاينة الحزمة.");
      })();
    });
  }

  async function manageAssignment(method: "POST" | "DELETE") {
    if (!selectedUser || !selectedBundle) {
      toast.error("اختر مستخدمًا وحزمة صالحة أولًا.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/roles/assign", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: selectedUser.id,
            bundle_key: selectedBundle.key,
            notes: notes || undefined
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<AssignmentResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setNotes("");
        toast.success(
          method === "POST"
            ? "تم إسناد الحزمة بنجاح."
            : "تم إلغاء الحزمة بنجاح."
        );
        router.refresh();
      })();
    });
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PX-10-T02 / T03</p>
          <h2>مركز الحِزم والصلاحيات الدقيقة</h2>
        </div>
        <ShieldCheck size={18} />
      </div>

      <p className="workspace-footnote">
        يبقى <code>profiles.role</code> هو السقف الأساسي، بينما تُسند الحِزم التشغيلية هنا بشكل auditable دون فتح grants جديدة.
      </p>

      <div className="stack-form">
        <label className="stack-field">
          <span>الحزمة</span>
          <select value={selectedBundleKey} onChange={(event) => setSelectedBundleKey(event.target.value)}>
            {permissionBundles.map((bundle) => (
              <option key={bundle.id} value={bundle.key}>
                {bundle.label} ({bundle.base_role})
              </option>
            ))}
          </select>
        </label>

        <label className="stack-field">
          <span>المستخدم</span>
          <select
            value={selectedUser?.id ?? ""}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={eligibleUsers.length === 0}
          >
            {eligibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name ?? user.id} ({user.role})
              </option>
            ))}
          </select>
        </label>

        <label className="stack-field">
          <span>ملاحظة التعيين / الإلغاء</span>
          <textarea
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="مثال: Bundle جرد لنوبة المساء"
          />
        </label>

        <div className="actions-row">
          <button type="button" className="secondary-button" disabled={isPending || !selectedBundleKey} onClick={() => void runPreview()}>
            {isPending ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
            معاينة الحزمة
          </button>
          <button type="button" className="primary-button" disabled={isPending || !selectedUser || !selectedBundle} onClick={() => void manageAssignment("POST")}>
            إسناد
          </button>
          <button type="button" className="secondary-button" disabled={isPending || !selectedUser || !selectedBundle} onClick={() => void manageAssignment("DELETE")}>
            إلغاء
          </button>
        </div>
      </div>

      {preview ? (
        <div className="result-card">
          <h3>{preview.bundle_key}</h3>
          <p>الدور الأساسي: {preview.base_role}</p>
          <p>الحد الأقصى للخصم: {preview.max_discount_percentage ?? "غير محدد"}</p>
          <p>يتطلب اعتماد خصم: {preview.discount_requires_approval ? "نعم" : "لا"}</p>
          <p>الصلاحيات: {preview.permissions.join("، ") || "لا يوجد"}</p>
        </div>
      ) : null}

      {selectedUser ? (
        <div className="workspace-panel workspace-panel--muted">
          <p className="eyebrow">Active Assignments</p>
          <h3>{selectedUser.full_name ?? selectedUser.id}</h3>
          {selectedUserAssignments.length > 0 ? (
            <ul className="compact-list">
              {selectedUserAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <strong>{assignment.bundle_label}</strong>
                  <span> — {assignment.bundle_key}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="workspace-footnote">لا توجد حِزم نشطة لهذا المستخدم.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
