export default function SidebarContentFrame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white pb-3 pt-3 px-3 rounded-xl">
      <div className="mb-3">
        <p className="text-lg font-bold text-gray-700 border-b-4 border-blue-900">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
