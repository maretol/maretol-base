import Modal from './modal'
import fetchCiteImage from '@/lib/api/cite_image'

// パラレルルート・セマンティクスルート機能で、ブログ内から画像をクリックしたときはこのモーダルが表示される
export default async function ImageModal(props: { params: Promise<{ article_id: string; src: string }> }) {
  const params = await props.params
  const imageSrcBase64 = decodeURIComponent(params.src).replace(/-/g, '+').replace(/_/g, '/')
  const imageSrc = Buffer.from(imageSrcBase64, 'base64').toString('utf-8')

  // 外部画像（http/https始まりかつ自サイトでない）の場合はキャッシュからデータを取得
  const isExternalImage = imageSrc.startsWith('http') && !imageSrc.includes('maretol.xyz') && !imageSrc.includes('r2.maretol.xyz')
  let imageData: string | null = null
  if (isExternalImage) {
    const result = await fetchCiteImage(imageSrc)
    imageData = result.success ? result.data : null
  }

  return <Modal imageSrc={imageSrc} imageData={imageData} />
}
