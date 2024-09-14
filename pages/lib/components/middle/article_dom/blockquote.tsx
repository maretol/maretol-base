export default function Blockquote({
  innerHTML,
  attrs,
}: {
  innerHTML: string
  attrs?: { [name: string]: string }
}) {
  const cite = attrs?.['cite']
  return (
    <blockquote cite={cite}>
      <div dangerouslySetInnerHTML={{ __html: innerHTML }} />
    </blockquote>
  )
}
