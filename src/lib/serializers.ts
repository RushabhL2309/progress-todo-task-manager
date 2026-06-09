import type { CompletionDocument } from "@/models/Completion";
import type { ExtraTaskDocument } from "@/models/ExtraTask";
import type { ScheduledTaskDocument } from "@/models/ScheduledTask";
import type { CompletionDTO, ExtraTaskDTO, ScheduledTaskDTO } from "./types";
import { completionKey } from "./dates";

export function toScheduledTaskDTO(doc: ScheduledTaskDocument): ScheduledTaskDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function toCompletionDTO(doc: CompletionDocument): CompletionDTO {
  return {
    id: doc._id.toString(),
    scheduledTaskId: doc.scheduledTaskId.toString(),
    date: doc.date,
    completed: doc.completed,
  };
}

export function toExtraTaskDTO(doc: ExtraTaskDocument): ExtraTaskDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    date: doc.date,
    completed: doc.completed,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function completionsToMap(docs: CompletionDocument[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const doc of docs) {
    if (doc.completed) {
      map[completionKey(doc.scheduledTaskId.toString(), doc.date)] = true;
    }
  }
  return map;
}
