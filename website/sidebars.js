// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  gettingStarted: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      link: { type: 'doc', id: 'getting-started/quick-start' },
      items: [
        'getting-started/quick-start',
        'getting-started/installation',
        'getting-started/configuration',
      ],
    },
  ],

  userGuide: [
    {
      type: 'category',
      label: 'User Guide',
      collapsed: false,
      link: { type: 'doc', id: 'user-guide/overview' },
      items: [
        'user-guide/overview',
        'user-guide/views',
        'user-guide/editors',
        'user-guide/slurm',
        'user-guide/simulator',
      ],
    },
  ],

  adminGuide: [
    {
      type: 'category',
      label: 'Admin Guide',
      collapsed: false,
      link: { type: 'doc', id: 'admin-guide/deployment' },
      items: [
        'admin-guide/deployment',
        'admin-guide/topology-yaml',
        'admin-guide/templates',
        'admin-guide/prometheus',
      ],
    },
  ],

  apiReference: [
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      link: { type: 'doc', id: 'api-reference/overview' },
      items: [
        'api-reference/overview',
        'api-reference/telemetry',
        'api-reference/topology',
        'api-reference/metrics',
        'api-reference/plugins',
      ],
    },
  ],

  architecture: [
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      link: { type: 'doc', id: 'architecture/overview' },
      items: [
        'architecture/overview',
        'architecture/data-model',
        'architecture/backend',
        'architecture/frontend',
      ],
    },
  ],

  plugins: [
    {
      type: 'category',
      label: 'Plugins',
      collapsed: false,
      link: { type: 'doc', id: 'plugins/overview' },
      items: [
        'plugins/overview',
        'plugins/simulator',
        'plugins/slurm',
        'plugins/writing-plugins',
      ],
    },
  ],
};

export default sidebars;
