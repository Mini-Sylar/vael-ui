// Shared data to avoid duplication across OverviewPage and OrdersPage

export interface Order {
  id: string
  customer: string
  email: string
  amount: number
  status: 'paid' | 'pending' | 'refunded'
  date: string
}

const CUSTOMER_NAMES = [
  'Ama Mensah',
  'Kwame Owusu',
  'Efua Boateng',
  'Kofi Asante',
  'Priya Nair',
  'Wei Chen',
  'Sofia Rossi',
  'Liam Walsh',
  'Noor Haddad',
  'Diego Silva',
  'Freya Lindqvist',
  'Hiro Suzuki',
  'Zainab Nkomo',
  'Mateo Novak',
  'Adjoa Frimpong',
]

export const STATUS_VARIANT: Record<Order['status'], 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  pending: 'warning',
  refunded: 'danger',
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`
}

export const orders: Order[] = Array.from({ length: 180 }, (_, i) => {
  const customer = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length]!
  const statuses: Order['status'][] = ['paid', 'pending', 'refunded']
  return {
    id: `ORD-${String(1000 + i)}`,
    customer,
    email: emailFor(customer),
    amount: Math.round((35 + ((i * 37) % 460)) * 100) / 100,
    status: statuses[i % statuses.length]!,
    date: new Date(2026, 0, 1 + (i % 28)).toISOString().slice(0, 10),
  }
})

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export interface Customer {
  id: string
  name: string
  email: string
  region: string
  country: string
  segment: 'enterprise' | 'growth' | 'starter'
  tags: string[]
  lifetimeValue: number
  orders: number
}

const REGIONS: Record<string, string[]> = {
  Africa: ['Ghana', 'Nigeria', 'Kenya'],
  Europe: ['France', 'Germany', 'Portugal'],
  Asia: ['Japan', 'India', 'Singapore'],
  Americas: ['United States', 'Brazil', 'Canada'],
}
const SEGMENTS: Customer['segment'][] = ['enterprise', 'growth', 'starter']
const TAG_POOL = ['vip', 'trial', 'churn-risk', 'beta', 'referral', 'annual']

export const customers: Customer[] = CUSTOMER_NAMES.map((name, i) => {
  const regionNames = Object.keys(REGIONS)
  const region = regionNames[i % regionNames.length]!
  const country = REGIONS[region]![i % REGIONS[region]!.length]!
  return {
    id: `cus_${i}`,
    name,
    email: emailFor(name),
    region,
    country,
    segment: SEGMENTS[i % SEGMENTS.length]!,
    tags: [TAG_POOL[i % TAG_POOL.length]!, TAG_POOL[(i + 2) % TAG_POOL.length]!],
    lifetimeValue: Math.round((800 + ((i * 311) % 9000)) * 100) / 100,
    orders: 1 + ((i * 7) % 24),
  }
})

export interface StatDef {
  label: string
  value: number
  format: 'currency' | 'number' | 'percent'
  trend: string
  trendVariant: 'success' | 'warning' | 'danger'
  progress?: number
}

export const stats: StatDef[] = [
  {
    label: 'Revenue (30d)',
    value: 128430,
    format: 'currency',
    trend: '+12.4%',
    trendVariant: 'success',
  },
  {
    label: 'Active customers',
    value: 1284,
    format: 'number',
    trend: '+3.1%',
    trendVariant: 'success',
  },
  {
    label: 'Order fulfillment',
    value: 68,
    format: 'percent',
    trend: 'on track',
    trendVariant: 'success',
    progress: 68,
  },
  { label: 'Refund rate', value: 1.8, format: 'percent', trend: '+0.4%', trendVariant: 'danger' },
]
