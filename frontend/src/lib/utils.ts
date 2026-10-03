import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultAvatar(gender?: string | null): string {
  if (!gender) return '/avatar-male.jpeg'
  const g = gender.trim().toUpperCase()
  if (g === 'FEMALE' || g === 'F' || g === 'WOMAN') {
    return '/avatar-female.jpeg'
  }
  return '/avatar-male.jpeg'
}
