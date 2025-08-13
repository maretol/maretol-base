export default async function TopPageContentsChild({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:snap-start scroll-pl-16 snap-center snap-always h-full lg:w-2/3 w-4/5 mb-4 flex-none">
      {children}
    </div>
  )
}
