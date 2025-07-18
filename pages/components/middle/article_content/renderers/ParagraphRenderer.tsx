import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext, POptionType } from '../types'
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

export class ParagraphRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'p'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element | null {
    const pOption = content.p_option as POptionType | null

    if (pOption === null || pOption === 'normal') {
      return this.renderNormalParagraph(content, context)
    }

    const renderers: Record<POptionType, () => JSX.Element | null> = {
      normal: () => this.renderNormalParagraph(content, context),
      image: () => this.renderImage(content, context),
      photo: () => this.renderPhoto(content, context),
      youtube: () => this.renderYouTube(content, context),
      twitter: () => this.renderTwitter(content, context),
      amazon: () => this.renderAmazon(content, context),
      url: () => this.renderURL(content, context),
      blog: () => this.renderBlog(content, context),
      artifact: () => this.renderArtifact(content, context),
      comic: () => this.renderComic(content, context),
      empty: () => this.renderEmpty(content, context),
      table_of_contents: () => this.renderTableOfContents(content, context),
      block_start: () => null, // TODO: Implement block handling
      block_end: () => null, // TODO: Implement block handling
    }

    const renderer = renderers[pOption]
    return renderer ? renderer() : this.renderNormalParagraph(content, context)
  }

  private renderNormalParagraph(content: ParsedContent, context: RenderContext): JSX.Element {
    return <P key={context.index} innerHTML={content.inner_html || content.text} attrs={content.attributes} />
  }

  private renderImage(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <ContentImage
          tag="content_image"
          src={content.text}
          subText={content.sub_texts ?? null}
          articleID={context.articleID}
        />
      </div>
    )
  }

  private renderPhoto(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <ContentImage
          tag="content_photo"
          src={content.text}
          subText={content.sub_texts ?? null}
          articleID={context.articleID}
        />
      </div>
    )
  }

  private renderYouTube(content: ParsedContent, context: RenderContext): JSX.Element {
    return <YouTubeArea key={context.index} videoURL={content.text} />
  }

  private renderTwitter(content: ParsedContent, context: RenderContext): JSX.Element {
    return <TwitterArea key={context.index} twitterURL={content.text} />
  }

  private renderAmazon(content: ParsedContent, context: RenderContext): JSX.Element {
    return <AmazonArea key={context.index} amazonURL={content.text} />
  }

  private renderURL(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-3">
        <Suspense fallback={<LoadingLinkcard link={content.text} />}>
          <LinkCard link={content.text} />
        </Suspense>
      </div>
    )
  }

  private renderBlog(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <Suspense fallback={<LoadingBlogCard />}>
          <BlogCard link={content.text} />
        </Suspense>
      </div>
    )
  }

  private renderArtifact(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <Suspense fallback={<LoadingBlogCard />}>
          <ArtifactCard link={content.text} />
        </Suspense>
      </div>
    )
  }

  private renderComic(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <Suspense fallback={<LoadingComicCard />}>
          <ComicPageCard link={content.text} />
        </Suspense>
      </div>
    )
  }

  private renderEmpty(content: ParsedContent, context: RenderContext): JSX.Element {
    return <Br key={context.index} />
  }

  private renderTableOfContents(content: ParsedContent, context: RenderContext): JSX.Element | null {
    if (context.tableOfContents) {
      return <Table key={context.index} toc={context.tableOfContents} />
    }
    return null
  }
}
