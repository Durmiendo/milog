import { defineConfig } from 'vitepress'
import { generateSidebar } from "vitepress-sidebar";

const generated = generateSidebar({
  documentRootPath: '.',
  collapsed: false,
  capitalizeFirst: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  useFolderLinkFromIndexFile: true,
  sortMenusByFrontmatterOrder: true,
  excludeFilesByFrontmatterFieldName: 'hidden',
  excludeByGlobPattern: ['none/**', 'docs/**', 'index.md']
});

const stripExtensions = (items) => items.map(item => {
  const next = {...item};
  if (typeof next.link === 'string') {
    next.link = next.link.replace(/index\.md$/, '').replace(/\.md$/, '');
  }
  if (next.items) next.items = stripExtensions(next.items);
  return next;
});

const sidebar = stripExtensions(generated);

export default defineConfig({
  title: "MiLog",
  base: "/milog/",
  cleanUrls: true,
  vite: {
    ssr: {
      noExternal: ['vuedraggable']
    },
    optimizeDeps: {
      include: ['vuedraggable']
    }
  },
  themeConfig: {
    sidebar,
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Обучение', link: '/guide/' },
      { text: 'Песочница', link: '/none/sandbox' }
    ],
    outline: {
      label: 'Содержание'
    },
    docFooter: {
      prev: 'Назад',
      next: 'Вперёд'
    },
    darkModeSwitchLabel: 'Оформление',
    returnToTopLabel: 'Наверх',
    langMenuLabel: 'Язык',
    editLink: {
      pattern: 'https://github.com/user/repo/edit/main/:path',
      text: 'Редактировать эту страницу'
    }
  }
});