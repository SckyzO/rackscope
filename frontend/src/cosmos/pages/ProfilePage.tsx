import { Mail, Phone, MapPin, Link as LinkIcon, Twitter, Github, Edit } from 'lucide-react';

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
    {children}
  </div>
);

const skills = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'PostgreSQL',
  'Docker',
  'Tailwind CSS',
  'GraphQL',
];
const stats = [
  { label: 'Projects', value: '48' },
  { label: 'Followers', value: '12.3K' },
  { label: 'Following', value: '234' },
  { label: 'Reviews', value: '4.9' },
];

export const ProfilePage = () => (
  <div className="space-y-6">
    {/* Cover + Avatar */}
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="from-brand-500 to-brand-700 h-36 bg-gradient-to-r" />
      <div className="relative px-6 pb-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-14 flex items-end gap-4">
            <div className="bg-brand-500 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white text-2xl font-bold text-white dark:border-gray-900">
              JD
            </div>
            <div className="mb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">John Doe</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Senior Software Engineer</p>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
            <Edit className="h-4 w-4" /> Edit Profile
          </button>
        </div>
        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-6">
        <SectionCard title="About">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Passionate software engineer with 7+ years of experience building scalable web
            applications. I love open source, clean code, and coffee.
          </p>
          <div className="mt-4 space-y-3">
            {[
              { icon: Mail, text: 'john.doe@example.com' },
              { icon: Phone, text: '+1 (555) 000-0000' },
              { icon: MapPin, text: 'San Francisco, CA' },
              { icon: LinkIcon, text: 'johndoe.dev' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                {text}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="#"
              className="hover:border-brand-500 hover:text-brand-500 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="hover:border-brand-500 hover:text-brand-500 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </SectionCard>
        <SectionCard title="Skills">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 rounded-full px-3 py-1 text-xs font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Right column (2/3) */}
      <div className="space-y-6 lg:col-span-2">
        <SectionCard title="Recent Activity">
          <div className="space-y-4">
            {[
              {
                action: 'Pushed to',
                target: 'rackscope/main',
                time: '2 hours ago',
                color: 'bg-success-500',
              },
              {
                action: 'Opened PR in',
                target: 'cosmos/feature-branch',
                time: '5 hours ago',
                color: 'bg-brand-500',
              },
              {
                action: 'Commented on',
                target: 'issue #142',
                time: '1 day ago',
                color: 'bg-warning-500',
              },
              {
                action: 'Reviewed PR in',
                target: 'tailwind/v4-migration',
                time: '2 days ago',
                color: 'bg-gray-400',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item.action} <span className="text-brand-500 font-medium">{item.target}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Experience">
          <div className="space-y-5">
            {[
              {
                role: 'Senior Software Engineer',
                company: 'Rackscope Inc.',
                period: '2022 – Present',
                desc: 'Leading development of infrastructure monitoring platform.',
              },
              {
                role: 'Full Stack Developer',
                company: 'CloudTech',
                period: '2020 – 2022',
                desc: 'Built microservices architecture handling 10M+ daily requests.',
              },
              {
                role: 'Frontend Developer',
                company: 'StartupX',
                period: '2018 – 2020',
                desc: 'Developed React applications for SaaS products.',
              },
            ].map((exp, i) => (
              <div key={i} className="border-brand-200 dark:border-brand-800 border-l-2 pl-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{exp.role}</h4>
                <p className="text-brand-500 text-xs font-medium">{exp.company}</p>
                <p className="text-xs text-gray-400">{exp.period}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{exp.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
);
