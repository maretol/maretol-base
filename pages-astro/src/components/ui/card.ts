// カードの各部の class。.astro から class:list や cn() と組み合わせて使う
export const card = {
  root: 'rounded-lg border bg-card text-card-foreground shadow-xs',
  header: 'flex flex-col space-y-1.5 p-6 mx-2',
  title: 'text-2xl font-semibold leading-none tracking-tight',
  description: 'text-sm text-muted-foreground',
  content: 'p-6 pt-0',
  footer: 'flex items-center p-6 pt-0',
} as const
