import type React from 'react';
import type { WidgetType, WidgetConfig, DashboardData } from './types';

export type WidgetGroup = 'Stats' | 'Charts' | 'Monitoring' | 'Overview' | 'Catalog' | 'Legacy';

export type WidgetRegistration = {
  type: WidgetType;
  title: string;
  description: string;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  showTitle?: boolean;
  icon: React.ElementType;
  group: WidgetGroup;
  requiresPlugin?: string;
  component: React.ComponentType<{
    widget: WidgetConfig;
    data: DashboardData;
    navigate: (path: string) => void;
  }>;
};

const _registry = new Map<WidgetType, WidgetRegistration>();

export const registerWidget = (reg: WidgetRegistration): void => {
  _registry.set(reg.type, reg);
};

export const getWidget = (type: WidgetType): WidgetRegistration | undefined => _registry.get(type);

export const getAllWidgets = (): WidgetRegistration[] => [..._registry.values()];
