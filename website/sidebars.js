// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  gettingStarted: [
    'intro',
    'getting-started/quick-start',
    'getting-started/installation',
    'getting-started/configuration',
  ],

  userGuide: [
    'user-guide/overview',
    'user-guide/views',
    'user-guide/editors',
    'user-guide/slurm',
    'user-guide/simulator',
  ],

  adminGuide: [
    'admin-guide/deployment',
    'admin-guide/topology-yaml',
    'admin-guide/templates',
    'admin-guide/prometheus',
  ],

  apiReference: [
    'api-reference/overview',
    'api-reference/telemetry',
    'api-reference/topology',
    'api-reference/metrics',
    'api-reference/plugins',
  ],

  architecture: [
    'architecture/overview',
    'architecture/data-model',
    'architecture/backend',
    'architecture/frontend',
  ],

  plugins: [
    'plugins/overview',
    'plugins/simulator',
    'plugins/slurm',
    'plugins/writing-plugins',
  ],
};

export default sidebars;
