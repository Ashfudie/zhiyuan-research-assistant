import { Fragment } from 'react'

interface HighlightTextProps {
  text: string
  query?: string
}

export default function HighlightText({ text, query = '' }: HighlightTextProps) {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))]
  if (!terms.length) return <>{text}</>

  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  const matchers = terms.map((term) => term.toLocaleLowerCase())

  return (
    <>
      {parts.map((part, index) => (
        matchers.includes(part.toLocaleLowerCase())
          ? <mark key={`${index}-${part}`}>{part}</mark>
          : <Fragment key={`${index}-${part}`}>{part}</Fragment>
      ))}
    </>
  )
}
