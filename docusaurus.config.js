// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Alteration x10',
  tagline: 'Scala Talk',
  url: 'https://alterationx10.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'alterationx10',
  projectName: 'alterationx10',

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: {
          routeBasePath: '/',
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/alterationx10/alterationx10/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/type_safety_banner.png',
      navbar: {
        title: 'Alterationx10',
        items: [
          {to: '/', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/alterationx10/alterationx10',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Elsewhere',
            items: [
              {
                label: 'Twitter',
                href: 'https://twitter.com/alterationx10',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/alterationx10',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Mark Rudolph`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['java', 'scala'],
      },
    }),
};

module.exports = config;
