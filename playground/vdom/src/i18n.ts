import { createI18n } from 'vue-i18n'

/**
 * The app's own vue-i18n setup — vael-ui knows nothing about this package.
 * The `uiKit.*` namespace holds vael-ui's translatable strings, living
 * alongside the app's own `nav.*` keys in the SAME locale files: one
 * catalog, not two. See ConfigProvider's `i18n` prop in DialogDemo.vue.
 */
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      nav: { title: 'vael-ui playground' },
      uiKit: {
        dialog: { close: 'Close', maximize: 'Maximize', restore: 'Restore' },
        toast: { dismiss: 'Dismiss' },
        message: { dismiss: 'Dismiss' },
        pullToRefresh: {
          pull: 'Pull to refresh',
          release: 'Release to refresh',
          refreshing: 'Refreshing…',
          updated: 'Updated',
        },
        inputNumber: { increment: 'Increase', decrement: 'Decrease' },
        select: { empty: 'No options', clear: 'Clear selection' },
        combobox: { empty: 'No results', clear: 'Clear selection', toggle: 'Toggle options' },
        fileUpload: { browse: 'Browse files', drop: 'Drop files here', remove: 'Remove' },
      },
    },
    fr: {
      nav: { title: 'Aire de jeux vael-ui' },
      uiKit: {
        dialog: { close: 'Fermer', maximize: 'Agrandir', restore: 'Restaurer' },
        toast: { dismiss: 'Ignorer' },
        message: { dismiss: 'Ignorer' },
        pullToRefresh: {
          pull: 'Tirer pour actualiser',
          release: 'Relâcher pour actualiser',
          refreshing: 'Actualisation…',
          updated: 'Mis à jour',
        },
        inputNumber: { increment: 'Augmenter', decrement: 'Diminuer' },
        select: { empty: 'Aucune option', clear: 'Effacer la sélection' },
        combobox: {
          empty: 'Aucun résultat',
          clear: 'Effacer la sélection',
          toggle: 'Afficher les options',
        },
        fileUpload: {
          browse: 'Parcourir les fichiers',
          drop: 'Déposer les fichiers ici',
          remove: 'Supprimer',
        },
      },
    },
  },
})
