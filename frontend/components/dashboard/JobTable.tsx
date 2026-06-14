"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Trash2, XCircle, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import type { WSProgressMessage, JobStatus } from "@/lib/types";

interface Props {
  jobs: WSProgressMessage[];
  onCancel?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onRename?: (jobId: string, name: string) => void;
}

const ACTIVE_STATUSES: JobStatus[] = ["queued", "extracting_frames", "analyzing"];

function EditableName({ job, onRename }: { job: WSProgressMessage; onRename?: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(job.filename);

  const handleSave = () => {
    if (name.trim() && name !== job.filename) {
      onRename?.(job.job_id, name.trim());
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <p className="font-medium text-sm truncate max-w-[220px]" title={job.filename}>
          {job.filename}
        </p>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => setEditing(true)}
          title="Rename"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-sm w-[200px]"
        autoFocus
      />
      <button onClick={handleSave} title="Save"><Check className="h-4 w-4 text-green-500" /></button>
      <button onClick={() => setEditing(false)} title="Cancel"><X className="h-4 w-4 text-muted-foreground" /></button>
    </div>
  );
}

export function JobTable({ jobs, onCancel, onDelete, onRename }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No active tasks - upload a video or paste a link</p>
      </div>
    );
  }

  const isActive = (status: JobStatus) => ACTIVE_STATUSES.includes(status);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.job_id}>
              <TableCell>
                <EditableName job={job} onRename={onRename} />
                {job.error && (
                  <p className="text-xs text-destructive truncate mt-0.5">{job.error}</p>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={job.status}
                  currentStep={job.current_step}
                  dimension={job.dimension}
                />
              </TableCell>
              <TableCell className="w-[200px]">
                <div className="flex items-center gap-2">
                  <Progress value={job.progress_pct} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(job.progress_pct)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5">
                  {job.status === "completed" && (
                    <Link href={`/jobs/${job.job_id}`}>
                      <Button variant="ghost" size="icon" title="View results">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {isActive(job.status) && onCancel && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Cancel"
                      onClick={() => onCancel(job.job_id)}
                    >
                      <XCircle className="h-4 w-4 text-orange-500" />
                    </Button>
                  )}
                  {!isActive(job.status) && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => onDelete(job.job_id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
