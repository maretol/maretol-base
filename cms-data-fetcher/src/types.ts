export type RequestJSONType = {
  cms_content: string;
}

export type ContentDetail = {
  index: number
  tag_name: string
  class: string
  attributes: {[name: string]: string}
  inner_html: string | null
  text: string
  p_option: string | null
}

export type ResponseJSONType = {
  result : ContentDetail[]
}