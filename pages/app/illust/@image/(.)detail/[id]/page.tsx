export default async function ImageDrawer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = params.id

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Image Drawer</h1>
      <p>This is the image drawer for illustration ID: {id}</p>
    </div>
  )
}
