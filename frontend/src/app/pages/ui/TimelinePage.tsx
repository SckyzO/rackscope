import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';
import { Timeline, type TimelineItem } from '@app/components/data/Timeline';

const events: TimelineItem[] = [
  {
    id: 'e1',
    dotColor: '#465fff',
    title: 'Project created',
    description: 'Rackscope infrastructure monitoring project initialized.',
    time: '2 hours ago',
    avatar: { initials: 'AJ', bg: 'bg-brand-500' },
  },
  {
    id: 'e2',
    dotColor: '#12b76a',
    title: 'Team member joined',
    description: 'Sarah Williams joined the team as infrastructure engineer.',
    time: '4 hours ago',
    avatar: { initials: 'SW', bg: 'bg-green-500' },
  },
  {
    id: 'e3',
    dotColor: '#f59e0b',
    title: 'Configuration updated',
    description: 'New storage array E-Series added to topology config.',
    time: '1 day ago',
    avatar: { initials: 'MC', bg: 'bg-amber-500' },
  },
  {
    id: 'e4',
    dotColor: '#ef4444',
    title: 'Alert triggered',
    description: 'CRIT alert on node r01-01-c01 — node_up check failed.',
    time: '2 days ago',
    avatar: { initials: 'SY', bg: 'bg-red-500' },
  },
  {
    id: 'e5',
    dotColor: '#6b7280',
    title: 'Task completed',
    description: 'Phase 7 frontend rebuild milestone completed.',
    time: '3 days ago',
    avatar: { initials: 'ED', bg: 'bg-gray-500' },
  },
];

export const TimelinePage = () => {
  usePageTitle('Timeline');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="Activity feeds and chronological event display"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Timeline' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dot Timeline" desc='variant="dot" — colored dot + title + description'>
          <Timeline items={events} variant="dot" />
        </SectionCard>

        <SectionCard title="Avatar Timeline" desc='variant="avatar" — user initials avatar + name'>
          <Timeline items={events} variant="avatar" />
        </SectionCard>

        <SectionCard
          title="Card Timeline"
          desc='variant="card" — bordered cards with accent left bar'
        >
          <Timeline items={events.slice(0, 3)} variant="card" />
        </SectionCard>

        <SectionCard
          title="Card Timeline with Avatars"
          desc="card variant — avatar prop adds initials circle"
        >
          <Timeline
            items={events.slice(0, 3).map((e) => ({ ...e, avatar: e.avatar }))}
            variant="card"
          />
        </SectionCard>
      </div>
    </div>
  );
};
