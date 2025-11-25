import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    project: 'Project',
    competitor: 'Competitor',
    design: 'Design Inspiration',
    goals: 'Goals',
    page: 'Page',
    section: 'Section',
    feature: 'Feature',
    prd: 'PRD',
  };
  return labels[type] || type;
}

export function getSectionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    hero: 'Hero',
    features: 'Features',
    testimonials: 'Testimonials',
    cta: 'Call to Action',
    pricing: 'Pricing',
    faq: 'FAQ',
    team: 'Team',
    stats: 'Statistics',
    gallery: 'Gallery',
    contact: 'Contact',
    newsletter: 'Newsletter',
    footer: 'Footer',
    custom: 'Custom',
  };
  return labels[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    analyzing: 'bg-amber-100 text-amber-700',
    extracting: 'bg-amber-100 text-amber-700',
    building: 'bg-amber-100 text-amber-700',
    planning: 'bg-blue-100 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    complete: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-600';
}
