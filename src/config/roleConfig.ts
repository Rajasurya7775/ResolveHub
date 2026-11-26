import { UserRole } from '../types/user';

export interface RoleNavigationItem {
  to: string;
  label: string;
  icon: string;
}

export interface RoleKpiConfig {
  label: string;
  subtitle: string;
}

export interface RoleTableConfig {
  title: string;
  subtitle: string;
  scope: 'my-issues' | 'previous-issues';
  backPath: string;
}

export interface RoleDefinition {
  role: 'Developer' | 'Support';
  displayName: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  kpis: {
    card1: RoleKpiConfig;
    card2: RoleKpiConfig;
    card3: RoleKpiConfig;
    card4: RoleKpiConfig;
  };
  chart1Title: string;
  chart2Title: string;
  tables: {
    primary: RoleTableConfig;
    secondary: RoleTableConfig;
  };
  navLinks: RoleNavigationItem[];
}

export const ROLE_CONFIGS: Record<'Developer' | 'Support', RoleDefinition> = {
  Developer: {
    role: 'Developer',
    displayName: 'Developer',
    dashboardTitle: 'Developer Dashboard',
    dashboardSubtitle:
      'Developer Workspace — Manage assigned issues, track progress, and resolve technical issues efficiently.',
    kpis: {
      card1: { label: 'TOTAL ISSUES', subtitle: 'Total issues' },
      card2: { label: 'ASSIGNED ISSUES', subtitle: 'Assigned to me' },
      card3: { label: 'IN PROGRESS', subtitle: 'Currently working' },
      card4: { label: 'PENDING ISSUES', subtitle: 'Awaiting action' }
    },
    chart1Title: 'Issue Trends & Resolution Flow',
    chart2Title: 'Weekly Priority Distribution',
    tables: {
      primary: {
        title: 'Assigned Issues',
        subtitle: 'Issues assigned to your engineering queue',
        scope: 'my-issues',
        backPath: '/developer/assigned'
      },
      secondary: {
        title: 'All Issues',
        subtitle: 'All accessible technical issues across projects',
        scope: 'previous-issues',
        backPath: '/developer/all'
      }
    },
    navLinks: [
      { to: '/developer/home', label: 'Home', icon: 'bi-house-door-fill' },
      { to: '/developer/assigned', label: 'Assigned Issues', icon: 'bi-person-check-fill' },
      { to: '/developer/all', label: 'All Issues', icon: 'bi-grid-fill' }
    ]
  },
  Support: {
    role: 'Support',
    displayName: 'Supporter',
    dashboardTitle: 'Supporter Dashboard',
    dashboardSubtitle:
      'Operations Console — Track reported system incidents, shifts, and resolution statuses.',
    kpis: {
      card1: { label: 'TOTAL LOGGED', subtitle: 'All time logged' },
      card2: { label: 'ASSIGNED / IN PROGRESS', subtitle: 'Under development' },
      card3: { label: 'RESOLVED', subtitle: 'Closed tickets' },
      card4: { label: 'OPEN / PENDING', subtitle: 'Awaiting triage' }
    },
    chart1Title: 'Weekly Incident Volume & Lifecycle Trends',
    chart2Title: 'Incident Category Distribution',
    tables: {
      primary: {
        title: 'My Issues',
        subtitle: 'Track and manage your reported incident tickets',
        scope: 'my-issues',
        backPath: '/support/my-issues'
      },
      secondary: {
        title: 'Previous Issues',
        subtitle: 'Historical archive of past and resolved issues',
        scope: 'previous-issues',
        backPath: '/support/previous-issues'
      }
    },
    navLinks: [
      { to: '/support/home', label: 'Home', icon: 'bi-house-door-fill' },
      { to: '/support/my-issues', label: 'My Issues', icon: 'bi-list-ul' },
      { to: '/support/previous-issues', label: 'Previous Issues', icon: 'bi-clock-history' }
    ]
  }
};

/**
 * Normalizes user role into supported 'Developer' | 'Support' role key
 */
export function resolveRoleKey(rawRole?: UserRole | string): 'Developer' | 'Support' {
  const r = String(rawRole || '').toLowerCase();
  if (r.includes('dev')) return 'Developer';
  return 'Support';
}

/**
 * Gets role definition for a given user role
 */
export function getRoleConfig(rawRole?: UserRole | string): RoleDefinition {
  const key = resolveRoleKey(rawRole);
  return ROLE_CONFIGS[key];
}
