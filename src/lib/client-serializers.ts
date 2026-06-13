import type { ClientProjectDocument } from "@/models/ClientProject";
import type { ClientProjectEventDocument } from "@/models/ClientProjectEvent";
import type { ClientPaymentCheck, ClientProjectDTO, ClientProjectEventDTO } from "./auth-types";

function legacyPaymentChecks(doc: ClientProjectDocument): ClientPaymentCheck[] {
  const f = doc.paymentFlags;
  if (!f) return [];
  const items: ClientPaymentCheck[] = [];
  if (f.advanceReceived) items.push({ label: "Advance received", checked: true });
  else if (f.advanceReceived === false && doc.paymentNotes === "") {
    /* skip empty legacy */
  }
  if (f.partialPaid) items.push({ label: "Partial paid", checked: true });
  if (f.fullPaid) items.push({ label: "Full paid", checked: true });
  for (const label of f.customLabels ?? []) {
    if (label.trim()) items.push({ label: label.trim(), checked: false });
  }
  return items;
}

export function toClientProjectDTO(doc: ClientProjectDocument): ClientProjectDTO {
  const paymentChecks: ClientPaymentCheck[] =
    doc.paymentChecks && doc.paymentChecks.length > 0
      ? doc.paymentChecks.map((c) => ({
          label: c.label,
          checked: Boolean(c.checked),
        }))
      : legacyPaymentChecks(doc);

  return {
    id: doc._id.toString(),
    name: doc.name,
    stage: doc.stage as ClientProjectDTO["stage"],
    notes: doc.notes ?? "",
    paymentNotes: doc.paymentNotes ?? "",
    paymentChecks,
    linkedProjectId: doc.linkedProjectId?.toString() ?? null,
    followUpDate: doc.followUpDate ?? null,
    createdBy: doc.createdBy.toString(),
    assignedUserIds: (doc.assignedUserIds ?? []).map((id) => id.toString()),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toClientEventDTO(
  doc: ClientProjectEventDocument,
  userName = "User"
): ClientProjectEventDTO {
  return {
    id: doc._id.toString(),
    clientProjectId: doc.clientProjectId.toString(),
    userId: doc.userId.toString(),
    userName,
    action: doc.action,
    description: doc.description,
    fromStage: (doc.fromStage as ClientProjectEventDTO["fromStage"]) ?? null,
    toStage: (doc.toStage as ClientProjectEventDTO["toStage"]) ?? null,
    metadata: (doc.metadata as Record<string, unknown>) ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}
