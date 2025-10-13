import IllustDrawerPage from '@/components/drawers/illust-drawer-page'

export default async function IllustDrawer(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ draftKey: string | string[] | undefined }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const draftKey = searchParams.draftKey as string | undefined
  return <IllustDrawerPage id={params.id} draftKey={draftKey} />
}
