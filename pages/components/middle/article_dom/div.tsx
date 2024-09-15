export default function Div({
  innerHTML,
  attrs,
}: {
  innerHTML: string
  attrs?: { [name: string]: string }
}) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: innerHTML }}
      className={attrs?.['class']}
    />
  )
}
