import { rewriteImageURL } from '@/lib/image'
import Modal from './modal'
import { originImageOption } from '@/lib/static'

// パラレルルート・セマンティクスルート機能で、ブログ内から画像をクリックしたときはこのモーダルが表示される
export default async function ImageModal(props: { params: Promise<{ article_id: string; src: string }> }) {
  const params = await props.params
  const imageSrcBase64 = decodeURIComponent(params.src)
  const imageSrc = Buffer.from(imageSrcBase64, 'base64').toString('utf-8')
  const rewrittenImageSrc = rewriteImageURL(originImageOption, imageSrc)
  return <Modal imageSrc={rewrittenImageSrc} />
}
