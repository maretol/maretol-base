import IllustDrawerPage from '@/components/drawers/illust-drawer-page'

export default async function IllustDrawer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  return <IllustDrawerPage id={params.id} />
}
