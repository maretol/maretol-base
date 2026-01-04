import { ParsedContent } from 'api-types'
import { RenderContext, POptionType } from '../types'
import { JSX, Suspense } from 'react'
import P from '../../article_dom/p'
import ContentImage from '../../article_dom/image'
import YouTubeArea from '../../article_dom/youtube'
import TwitterArea from '../../article_dom/twitter'
import AmazonArea from '../../article_dom/amazon'
import LinkCard from '../../article_dom/linkcard'
import BlogCard from '../../article_dom/blogcard'
import ArtifactCard from '../../article_dom/artifactcard'
import ComicPageCard from '../../article_dom/comiccard'
import Br from '../../article_dom/br'
import Table from '../../article_dom/table_of_contents'
import LoadingLinkcard from '../../loading_dom/loading_linkcard'
import LoadingBlogCard from '../../loading_dom/loading_blogcard'
import LoadingComicCard from '../../loading_dom/loading_comiccard'
import IllustCard from '../../article_dom/illustcard'
import MySiteCard from '../../article_dom/mysitecard'
import LoadingIllustCard from '../../loading_dom/loading_illustcard'
import NofetchLinkCard from '../../article_dom/nofetch_link'
import Gmaps from '../../article_dom/gmap'
import CiteImage from '../../article_dom/cite_image'

export function renderParagraph(content: ParsedContent, context: RenderContext): JSX.Element | null {
  const pOption = content.p_option as POptionType | null

  if (pOption === null || pOption === 'normal') {
    return renderNormalParagraph(content, context)
  }

  const renderers: Record<POptionType, () => JSX.Element | null> = {
    normal: () => renderNormalParagraph(content, context),
    image: () => renderImage(content, context),
    photo: () => renderPhoto(content, context),
    my_site: () => renderSiteLink(content, context),
    youtube: () => renderYouTube(content, context),
    twitter: () => renderTwitter(content, context),
    amazon: () => renderAmazon(content, context),
    url: () => renderURL(content, context),
    blog: () => renderBlog(content, context),
    artifact: () => renderArtifact(content, context),
    comic: () => renderComic(content, context),
    illust_detail: () => renderIllust(content, context),
    empty: () => renderEmpty(content, context),
    table_of_contents: () => renderTableOfContents(content, context),
    nofetch_url: () => renderNofetchURL(content, context),
    gmaps: () => renderGoogleMaps(content, context),
    block_start: () => null, // TODO: Implement block handling
    block_end: () => null, // TODO: Implement block handling
    cite_image: () => renderCiteImage(content, context),
  }

  const renderer = renderers[pOption]
  return renderer ? renderer() : renderNormalParagraph(content, context)
}

function renderNormalParagraph(content: ParsedContent, context: RenderContext): JSX.Element {
  return <P key={context.index} innerHTML={content.inner_html || content.text} attrs={content.attributes} />
}

function renderImage(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <ContentImage
        tag="content_image"
        src={content.text}
        subText={content.sub_texts ?? null}
        articleID={context.articleID}
      />
    </div>
  )
}

function renderPhoto(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <ContentImage
        tag="content_photo"
        src={content.text}
        subText={content.sub_texts ?? null}
        articleID={context.articleID}
      />
    </div>
  )
}

function renderSiteLink(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <MySiteCard key={context.index} text={content.text} />
    </div>
  )
}

function renderYouTube(content: ParsedContent, context: RenderContext): JSX.Element {
  return <YouTubeArea key={context.index} videoURL={content.text} />
}

function renderTwitter(content: ParsedContent, context: RenderContext): JSX.Element {
  return <TwitterArea key={context.index} twitterURL={content.text} />
}

function renderAmazon(content: ParsedContent, context: RenderContext): JSX.Element {
  return <AmazonArea key={context.index} amazonURL={content.text} />
}

function renderURL(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <Suspense fallback={<LoadingLinkcard link={content.text} />}>
        <LinkCard link={content.text} />
      </Suspense>
    </div>
  )
}

function renderNofetchURL(content: ParsedContent, context: RenderContext): JSX.Element {
  const url = content.sub_texts?.url
  const title = content.sub_texts?.title
  const description = content.sub_texts?.description

  return (
    <div key={context.index} className="py-4">
      <NofetchLinkCard url={url} title={title} description={description} />
    </div>
  )
}

function renderBlog(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <Suspense fallback={<LoadingBlogCard />}>
        <BlogCard link={content.text} />
      </Suspense>
    </div>
  )
}

function renderIllust(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <Suspense fallback={<LoadingIllustCard />}>
        <IllustCard link={content.text} draftKey={context.draftKey} />
      </Suspense>
    </div>
  )
}

function renderArtifact(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <Suspense fallback={<LoadingBlogCard />}>
        <ArtifactCard link={content.text} />
      </Suspense>
    </div>
  )
}

function renderComic(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index} className="py-4">
      <Suspense fallback={<LoadingComicCard />}>
        <ComicPageCard link={content.text} />
      </Suspense>
    </div>
  )
}

function renderEmpty(content: ParsedContent, context: RenderContext): JSX.Element {
  return <Br key={context.index} />
}

function renderTableOfContents(content: ParsedContent, context: RenderContext): JSX.Element | null {
  if (context.tableOfContents) {
    return <Table key={context.index} toc={context.tableOfContents} />
  }
  return null
}

function renderGoogleMaps(content: ParsedContent, context: RenderContext): JSX.Element {
  return <Gmaps key={content.index} subtexts={content.sub_texts} />
}

function renderCiteImage(content: ParsedContent, context: RenderContext): JSX.Element | null {
  const url = content.sub_texts?.url
  const source = content.sub_texts?.source

  // 必須パラメータ欠落時はnullを返却（行を非表示）
  if (!url || !source) {
    return null
  }

  const caption = content.sub_texts?.caption
  const sourceTitle = content.sub_texts?.source_title

  return (
    <div key={context.index} className="py-4">
      <CiteImage url={url} source={source} caption={caption} sourceTitle={sourceTitle} articleID={context.articleID} />
    </div>
  )
}
