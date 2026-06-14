"use client"

import * as React from "react"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox({ checked = false, onCheckedChange, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`h-4 w-4 shrink-0 rounded border border-primary/50 flex items-center justify-center transition-colors
        ${checked ? "bg-primary border-primary" : "bg-transparent"}
        hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
        </svg>
      )}
    </button>
  )
}
