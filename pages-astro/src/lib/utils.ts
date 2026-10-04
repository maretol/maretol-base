import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// URL として読めない文字列は null
export function parseURL(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}
