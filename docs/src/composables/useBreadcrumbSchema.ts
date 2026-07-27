import { useHead } from '@unhead/vue'

export interface BreadcrumbItem {
  name: string
  url: string
}

export function useBreadcrumbSchema(items: () => BreadcrumbItem[]) {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: () =>
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items().map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: item.url,
            })),
          }),
      },
    ],
  })
}
