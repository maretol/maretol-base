import SidebarContentFrame from './sidebar_content'

export default async function Profile({ rawText }: { rawText: string }) {
  const texts = rawText.split('\n')

  return (
    <SidebarContentFrame title="Profile">
      <div className="">
        <div className="">
          {texts.map((text, index) => (
            <p key={index} className="text-sm text-gray-700">
              {text}
            </p>
          ))}
        </div>
      </div>
    </SidebarContentFrame>
  )
}
