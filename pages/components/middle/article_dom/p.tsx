export default function P({ innerHTML, attrs }: { innerHTML: string; attrs?: { [name: string]: string } }) {
  const textAlign = attrs?.['style']?.match(/text-align: (left|center|right)/)
  const style = textAlign
    ? { textAlign: textAlign[1] as 'left' | 'center' | 'right' }
    : { textAlign: 'left' as 'left' | 'center' | 'right' }
  return <p style={style} dangerouslySetInnerHTML={{ __html: innerHTML }} className={'leading-8 mx-3'} />
}
