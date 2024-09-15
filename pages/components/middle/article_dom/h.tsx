export default function Hn({ tag, text }: { tag: string; text: string }) {
  if (tag === 'h1') {
    return <h1>{text}</h1>
  }
  if (tag === 'h2') {
    return <h2>{text}</h2>
  }
  if (tag === 'h3') {
    return <h3>{text}</h3>
  }
  if (tag === 'h4') {
    return <h4>{text}</h4>
  }
  if (tag === 'h5') {
    return <h5>{text}</h5>
  }
  return <p>{text}</p>
}
