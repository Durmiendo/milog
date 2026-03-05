import { defineConfig } from 'vitepress'
import { generateSidebar } from "vitepress-sidebar";

const sidebar = generateSidebar({
  documentRootPath: '.',
  collapsed: false,
  capitalizeFirst: true,
  useTitleFromFrontmatter: true,
});

const translateSidebar = (items) => {
  return items.map(item => {
    if (item.text === 'Docs') item.text = 'Руководство';
    if (item.text === 'Guide') item.text = 'Основы';

    if (item.items) item.items = translateSidebar(item.items);
    return item;
  });
};

export default defineConfig({
  title: "MiLog",
  base: "/milog.github.io/",
  vite: {
    ssr: {
      noExternal: ['vuedraggable']
    },
    optimizeDeps: {
      include: ['vuedraggable']
    }
  },
  themeConfig: {
    sidebar: translateSidebar(sidebar),
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Начало', link: '/index' },
      { text: 'Песочница', link: '/none/sandbox' }
    ],
    editLink: {
      pattern: 'https://github.com/user/repo/edit/main/:path',
      text: 'Редактировать эту страницу'
    }
  }
});