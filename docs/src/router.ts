import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
    {
      path: '/docs/getting-started',
      name: 'getting-started',
      component: () => import('./pages/GettingStarted.vue'),
    },
    {
      path: '/docs/guides/tailwind',
      name: 'guide-tailwind',
      component: () => import('./pages/guides/UsingWithTailwind.vue'),
    },
    {
      path: '/docs/guides/global-setup',
      name: 'guide-global-setup',
      component: () => import('./pages/guides/GlobalSetup.vue'),
    },
    {
      path: '/docs/guides/animation-integration',
      name: 'guide-animation-integration',
      component: () => import('./pages/guides/AnimationIntegration.vue'),
    },
    {
      path: '/docs/guides/styling-and-layers',
      name: 'guide-styling-and-layers',
      component: () => import('./pages/guides/StylingAndLayers.vue'),
    },
    {
      path: '/docs/guides/i18n-keys',
      name: 'guide-i18n-keys',
      component: () => import('./pages/guides/I18nKeys.vue'),
    },
    {
      path: '/components/:name',
      name: 'component',
      component: () => import('./pages/ComponentPage.vue'),
    },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 88 }
    return { top: 0 }
  },
})
