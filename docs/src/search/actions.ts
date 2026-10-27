// Things the palette can do, not only find: change the site's settings, copy the install
// command, open the repository. Type ">" to see only these.
import {
  PhCircleHalf,
  PhFilmStrip,
  PhGithubLogo,
  PhHeart,
  PhLightningSlash,
  PhMonitor,
  PhMoon,
  PhPalette,
  PhResize,
  PhSparkle,
  PhSpinnerGap,
  PhSun,
  PhTerminal,
  PhTranslate,
  PhBug,
} from '@phosphor-icons/vue'
import type { DocsSettings } from '../docsSettings'
import { SUPPORTED_LOCALES } from '../i18n'
import { defaultVariant, packageManager, primaryColor } from '../preferences'
import type { PaletteEntry } from './entries'

type Translate = (key: string) => string

// In their own language: someone looking for theirs reads it, whatever the page is in now.
const LOCALE_NAMES: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  it: 'Italiano',
  ja: '日本語',
  zh: '中文',
}

const THEME_PRESETS = [
  { key: 'default', color: null },
  { key: 'blue', color: '#2563eb' },
  { key: 'violet', color: '#7c3aed' },
  { key: 'rose', color: '#e11d48' },
  { key: 'orange', color: '#ea580c' },
  { key: 'green', color: '#16a34a' },
] as const

const INSTALL: Record<string, string> = {
  npm: 'npm install vael-ui',
  pnpm: 'pnpm add vael-ui',
  yarn: 'yarn add vael-ui',
  bun: 'bun add vael-ui',
}

export function actionEntries(
  t: Translate,
  settings: DocsSettings,
  copy: (text: string) => void,
): PaletteEntry[] {
  const group = t('search.actions')
  const current = t('search.current')
  const action = (
    id: string,
    label: string,
    icon: PaletteEntry['icon'],
    run: () => void,
    active = false,
    keywords: string[] = [],
  ): PaletteEntry => ({
    id: `action:${id}`,
    kind: 'action',
    label,
    icon,
    run,
    group,
    keywords,
    boost: -1,
    description: active ? current : undefined,
  })

  const mode = settings.mode.value
  const size = settings.size.value
  return [
    action(
      'mode-light',
      `${t('header.mode')}: ${t('header.light')}`,
      PhSun,
      () => settings.setMode('light'),
      mode === 'light',
      ['theme', 'appearance'],
    ),
    action(
      'mode-dark',
      `${t('header.mode')}: ${t('header.dark')}`,
      PhMoon,
      () => settings.setMode('dark'),
      mode === 'dark',
      ['theme', 'appearance'],
    ),
    action(
      'mode-system',
      `${t('header.mode')}: ${t('header.system')}`,
      PhMonitor,
      () => settings.setMode('system'),
      mode === 'system',
      ['theme', 'appearance'],
    ),
    action(
      'demo-vdom',
      `${t('header.defaultMode')}: ${t('component.vdom')}`,
      PhCircleHalf,
      () => (defaultVariant.value = 'vdom'),
      defaultVariant.value === 'vdom',
      ['vdom'],
    ),
    action(
      'demo-vapor',
      `${t('header.defaultMode')}: ${t('component.vapor')}`,
      PhSparkle,
      () => (defaultVariant.value = 'vapor'),
      defaultVariant.value === 'vapor',
      ['vapor'],
    ),
    ...THEME_PRESETS.map((preset) =>
      action(
        `color-${preset.key}`,
        `${t('header.primaryColor')}: ${t(`theme.${preset.key}`)}`,
        PhPalette,
        () => (primaryColor.value = preset.color),
        (primaryColor.value?.toLowerCase() ?? null) === preset.color,
        ['theme', 'accent'],
      ),
    ),
    ...(['sm', 'md', 'lg'] as const).map((value) =>
      action(
        `size-${value}`,
        `${t('header.size')}: ${t(`header.size${value.charAt(0).toUpperCase()}${value.slice(1)}`)}`,
        PhResize,
        () => (settings.size.value = value),
        size === value,
      ),
    ),
    ...(['ring', 'dots', 'bars', 'comet', 'dither'] as const).map((value) =>
      action(
        `loader-${value}`,
        `${t('header.loader')}: ${t(`header.loader${value.charAt(0).toUpperCase()}${value.slice(1)}`)}`,
        PhSpinnerGap,
        () => (settings.loaderType.value = value),
        settings.loaderType.value === value,
        ['spinner', 'loading'],
      ),
    ),
    action(
      'motion',
      `${t('header.animations')}: ${settings.motion.value ? t('search.off') : t('search.on')}`,
      settings.motion.value ? PhLightningSlash : PhFilmStrip,
      () => (settings.motion.value = !settings.motion.value),
      false,
      ['motion', 'reduce'],
    ),
    ...SUPPORTED_LOCALES.map((code) =>
      action(
        `locale-${code}`,
        `${t('header.locale')}: ${LOCALE_NAMES[code]}`,
        PhTranslate,
        () => (settings.locale.value = code),
        settings.locale.value === code,
        ['language', code],
      ),
    ),
    {
      ...action('install', t('search.copyInstall'), PhTerminal, () =>
        copy(INSTALL[packageManager.value] ?? INSTALL.npm!),
      ),
      description: INSTALL[packageManager.value] ?? INSTALL.npm,
    },
    action('github', t('nav.github'), PhGithubLogo, () =>
      window.open('https://github.com/Mini-Sylar/vael-ui', '_blank', 'noreferrer'),
    ),
    action('issue', t('search.reportIssue'), PhBug, () =>
      window.open('https://github.com/Mini-Sylar/vael-ui/issues/new', '_blank', 'noreferrer'),
    ),
    action('sponsor', t('nav.sponsor'), PhHeart, () =>
      window.open('https://github.com/sponsors/Mini-Sylar', '_blank', 'noreferrer'),
    ),
  ]
}
