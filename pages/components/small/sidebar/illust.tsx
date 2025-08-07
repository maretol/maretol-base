import { atelierResult } from 'api-types'
import SidebarContentFrame from '../sidebar_content'

type illust = {
  id: string
  title: string
  image: string
}

export default async function IllustSidebar({ atelier }: { atelier: atelierResult[] }) {
  const illustData: illust[] = atelier.map((a) => {
    const id = a.id
    const title = a.title
    const image = a.src
    return {
      id,
      title,
      image,
    }
  })

  return (
    <SidebarContentFrame title="Illustrations">
      <p>準備中</p>
    </SidebarContentFrame>
  )
}
