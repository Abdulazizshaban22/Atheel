/**
 * Wave123: Atheel Design System — Core UI Components
 * RTL-first, Arabic typography, Dark/Light mode, Atheel branding
 * Usage: import { StatusBadge, MetricCard, DataTable, ... } from '@/components/design-system';
 */

'use client';

import React, { type ReactNode } from 'react';

// ═══ Color Tokens ═══
export const COLORS = {
  primary: '#1B4965',      // Deep Teal — Atheel primary
  primaryLight: '#5FA8D3', // Light Teal
  accent: '#D4A574',       // Gold — Saudi heritage accent
  accentLight: '#E8CCA8',
  success: '#2D6A4F',
  warning: '#E9C46A',
  danger: '#E63946',
  neutral: '#6C757D',
  bg: '#FAFBFC',
  bgDark: '#0F172A',
  card: '#FFFFFF',
  cardDark: '#1E293B',
  text: '#1A1A2E',
  textDark: '#E2E8F0',
  border: '#E2E8F0',
  borderDark: '#334155',
} as const;

// ═══ StatusBadge ═══
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  danger: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
  neutral: { bg: '#F3F4F6', text: '#374151' },
  primary: { bg: '#E0F2FE', text: '#0C4A6E' },
};

export function StatusBadge({ label, variant = 'neutral', size = 'sm' }: {
  label: string;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
}) {
  const c = BADGE_COLORS[variant];
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 14;
  const padding = size === 'xs' ? '2px 6px' : size === 'sm' ? '3px 10px' : '4px 14px';

  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.text,
      fontSize, padding, borderRadius: 999, fontWeight: 600,
      lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ═══ MetricCard ═══
export function MetricCardV2({ title, value, subtitle, trend, variant = 'neutral', icon }: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  variant?: BadgeVariant;
  icon?: ReactNode;
}) {
  const trendColor = trend?.direction === 'up' ? COLORS.success : trend?.direction === 'down' ? COLORS.danger : COLORS.neutral;
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '20px 24px', minWidth: 200,
      borderTop: `3px solid ${BADGE_COLORS[variant].text}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, color: COLORS.neutral, fontWeight: 500, marginBottom: 8 }}>{title}</div>
        {icon && <div style={{ opacity: 0.5 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: COLORS.neutral, marginTop: 4 }}>{subtitle}</div>}
      {trend && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 8, fontWeight: 600 }}>
          {trendArrow} {trend.label}
        </div>
      )}
    </div>
  );
}

// ═══ ProgressBar ═══
export function ProgressBar({ value, max = 100, label, variant = 'primary', height = 8 }: {
  value: number;
  max?: number;
  label?: string;
  variant?: BadgeVariant;
  height?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = BADGE_COLORS[variant].text;

  return (
    <div>
      {label && <div style={{ fontSize: 12, color: COLORS.neutral, marginBottom: 4 }}>{label} — {pct.toFixed(0)}%</div>}
      <div style={{ background: '#E5E7EB', borderRadius: height, height, overflow: 'hidden' }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: height, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ═══ DataTable ═══
export function DataTable<T extends Record<string, unknown>>({ columns, rows, emptyMessage = 'لا توجد بيانات' }: {
  columns: { key: string; label: string; width?: string | number; render?: (row: T) => ReactNode }[];
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: '10px 14px', textAlign: 'right', fontWeight: 600,
                color: COLORS.neutral, borderBottom: `2px solid ${COLORS.border}`,
                width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: COLORS.neutral }}>{emptyMessage}</td></tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ═══ SectionCard ═══
export function SectionCard({ title, subtitle, badge, children, actions }: {
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: BadgeVariant };
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
            {badge && <StatusBadge label={badge.label} variant={badge.variant} size="xs" />}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: COLORS.neutral, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

// ═══ DomainPill ═══
const DOMAIN_COLORS: Record<string, string> = {
  heritage: '#92400E',
  destination: '#0E7490',
  mega_events: '#7C3AED',
  culture_programs: '#059669',
  urban_experience: '#2563EB',
  exhibition: '#DB2777',
};

export function DomainPill({ domain }: { domain: string }) {
  const color = DOMAIN_COLORS[domain] || COLORS.neutral;
  const labels: Record<string, string> = {
    heritage: 'التراث', destination: 'الوجهات', mega_events: 'الفعاليات الكبرى',
    culture_programs: 'البرامج الثقافية', urban_experience: 'التجربة الحضرية', exhibition: 'المعارض',
  };

  return (
    <span style={{
      display: 'inline-block', background: `${color}15`, color,
      fontSize: 11, padding: '2px 10px', borderRadius: 999,
      fontWeight: 700, border: `1px solid ${color}30`,
    }}>
      {labels[domain] || domain}
    </span>
  );
}

// ═══ ReadinessGauge ═══
export function ReadinessGauge({ score, label, size = 120 }: {
  score: number; // 0-100
  label?: string;
  size?: number;
}) {
  const color = score >= 85 ? COLORS.success : score >= 65 ? COLORS.warning : COLORS.danger;
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="#E5E7EB" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ marginTop: -size / 2 - 16, fontSize: 28, fontWeight: 800, color }}>{score}%</div>
      {label && <div style={{ fontSize: 12, color: COLORS.neutral, marginTop: size / 2 - 20 }}>{label}</div>}
    </div>
  );
}
