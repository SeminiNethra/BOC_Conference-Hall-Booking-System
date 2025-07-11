import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(time: string): string {
  // Convert 24-hour format to 12-hour format
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}
