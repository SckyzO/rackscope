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
    'user-guide/health-checks',
    'user-guide/topology-editor',
    'user-guide/dashboard',
    'user-guide/login',
    'user-guide/notifications',
    'user-guide/ui-library',
    'user-guide/wizard',
    'user-guide/error-pages',
    'user-guide/about',
  ],

  adminGuide: [
    'admin-guide/deployment',
    'admin-guide/topology-yaml',
    'admin-guide/templates',
    'admin-guide/prometheus',
    'admin-guide/app-yaml',
    'admin-guide/settings-ui',
    'admin-guide/importers',
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
    'architecture/dashboard-widgets',
  ],

  development: [
    'development/testing',
    'development/security',
  ],

  designSystem: [
    'design-system/overview',
    'design-system/page-actions',
    'design-system/forms',
    'design-system/status',
    'design-system/overlays',
    'design-system/feedback',
  ],

  plugins: [
    'plugins/overview',
    'plugins/simulator',
    'plugins/slurm',
    'plugins/writing-plugins',
  ],
};

export default sidebars;
