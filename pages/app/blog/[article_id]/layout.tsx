import React from 'react'

export default function BlogArticlePage(props: {
  children: React.ReactNode
  modal: React.ReactNode
  drawer: React.ReactNode
}) {
  return (
    <div>
      {props.children}
      {props.modal}
    </div>
  )
}
