import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl clinical-shadow border border-navy-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
      <div>
        <h3 className="font-semibold text-navy-900 text-base">{title}</h3>
        {subtitle && <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, color = 'navy' }: { children: ReactNode; color?: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'turquoise' }) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-medical-100 text-medical-700',
    turquoise: 'bg-turquoise-100 text-turquoise-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'green' | 'red' | 'amber' | 'blue' | 'navy' | 'turquoise'; icon: typeof CheckCircle2 }> = {
    'waiting': { label: 'En attente', color: 'amber', icon: Clock },
    'admitted': { label: 'Hospitalisé', color: 'blue', icon: CheckCircle2 },
    'in-consultation': { label: 'En consultation', color: 'turquoise', icon: Clock },
    'discharged': { label: 'Sorti', color: 'navy', icon: CheckCircle2 },
    'pending': { label: 'En attente', color: 'amber', icon: Clock },
    'in-progress': { label: 'En cours', color: 'blue', icon: Clock },
    'completed': { label: 'Terminé', color: 'green', icon: CheckCircle2 },
    'active': { label: 'Active', color: 'green', icon: CheckCircle2 },
    'dispensed': { label: 'Délivré', color: 'green', icon: CheckCircle2 },
    'cancelled': { label: 'Annulé', color: 'red', icon: AlertCircle },
    'available': { label: 'Disponible', color: 'green', icon: CheckCircle2 },
    'occupied': { label: 'Occupé', color: 'red', icon: AlertCircle },
    'cleaning': { label: 'En nettoyage', color: 'amber', icon: Clock },
    'reserved': { label: 'Réservé', color: 'blue', icon: Clock },
    'paid': { label: 'Payée', color: 'green', icon: CheckCircle2 },
    'partial': { label: 'Partiellement payée', color: 'amber', icon: Clock },
    'draft': { label: 'Brouillon', color: 'navy', icon: Clock },
    'ordered': { label: 'Commandé', color: 'amber', icon: Clock },
    'normal': { label: 'Normal', color: 'navy', icon: CheckCircle2 },
    'urgent': { label: 'Urgent', color: 'amber', icon: AlertTriangle },
    'critical': { label: 'Critique', color: 'red', icon: AlertCircle },
  };

  const config = map[status] || { label: status, color: 'navy' as const, icon: AlertCircle };
  const Icon = config.icon;

  return (
    <Badge color={config.color}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'turquoise';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-medical-600 text-white hover:bg-medical-700',
    secondary: 'bg-navy-100 text-navy-700 hover:bg-navy-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-navy-600 hover:bg-navy-50',
    turquoise: 'bg-turquoise-500 text-white hover:bg-turquoise-600',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent"
      />
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent resize-none"
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof AlertCircle; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-navy-400" />
      </div>
      <p className="text-navy-700 font-medium text-sm">{title}</p>
      {subtitle && <p className="text-navy-400 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="text-navy-900 font-semibold text-sm mb-3">{children}</h4>;
}
