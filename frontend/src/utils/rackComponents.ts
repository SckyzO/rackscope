import type { InfrastructureComponent, RackComponentRef, RackComponentTemplate } from '../types';

type ResolvedComponents = {
  front: InfrastructureComponent[];
  rear: InfrastructureComponent[];
  side: InfrastructureComponent[];
  main: InfrastructureComponent[];
};

const TYPE_MAP: Record<string, InfrastructureComponent['type']> = {
  pdu: 'power',
  power: 'power',
  cooling: 'cooling',
  management: 'management',
  network: 'network',
};

const resolveType = (type?: string): InfrastructureComponent['type'] => {
  if (!type) return 'other';
  const key = type.toLowerCase();
  return TYPE_MAP[key] || 'other';
};

const toInfraComponent = (
  template: RackComponentTemplate,
  ref: RackComponentRef,
  location: InfrastructureComponent['location']
): InfrastructureComponent => ({
  id: `${template.id}:${ref.side || 'center'}:${ref.u_position}`,
  name: template.name,
  type: resolveType(template.type),
  model: template.model,
  role: template.role,
  location,
  u_position: ref.u_position,
  u_height: ref.u_height ?? template.u_height,
});

export const resolveRackComponents = (
  refs: RackComponentRef[] = [],
  templates: Record<string, RackComponentTemplate> = {}
): ResolvedComponents => {
  const resolved: ResolvedComponents = {
    front: [],
    rear: [],
    side: [],
    main: [],
  };

  for (const ref of refs) {
    const template = templates[ref.template_id];
    if (!template) continue;

    if (template.location === 'side') {
      const side = ref.side === 'right' ? 'side-right' : 'side-left';
      resolved.side.push(toInfraComponent(template, ref, side));
      continue;
    }

    if (template.location === 'front') {
      resolved.front.push(toInfraComponent(template, ref, 'u-mount'));
      continue;
    }

    if (template.location === 'rear') {
      resolved.rear.push(toInfraComponent(template, ref, 'u-mount'));
      continue;
    }

    resolved.main.push(toInfraComponent(template, ref, 'u-mount'));
  }

  return resolved;
};
