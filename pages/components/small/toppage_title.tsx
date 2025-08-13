export default function TopPageTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-gradient-to-l from-bg-gray-50 to-gray-50/100 pl-2 rounded-lg py-1">
      <p className="text-2xl font-bold flex flex-row items-center gap-2">{children}</p>
    </div>
  )
}
