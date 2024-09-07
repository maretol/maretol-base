/**
 * CMSのHTMLにある程度従ったテキストを投げ込むとそれらをJSONでパースして返す処理
 */

import { ContentDetail, RequestJSONType } from "./types";
import { load } from "cheerio";

export interface Env {
	API_KEY: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// APIキーの認証
		const apiKey = request.headers.get("x-api-key");
		if (apiKey !== env.API_KEY) {
			return new Response("internal server error", { status: 500 });
		}

		const json = await request.json<RequestJSONType>();

		const $ = load(json.cms_content);

		const details = $("body > *").map((index, element): ContentDetail => {
			const tagName = element.tagName;
			const attrs = element.attribs
			const text = $(element).text();
			const innerHTML = $(element).html();
			const pOpt = tagName === 'p' ? getPOption(text) : null
			return {
				index,
				tag_name: tagName,
				class: $(element).attr("class") || "",
				attributes: attrs,
				inner_html: innerHTML,
				text,
				p_option: pOpt,
			};
		});

		return Response.json({ result: details.toArray() });
	},
} satisfies ExportedHandler<Env>;

function getPOption(text: string) {
	let pOpt = "normal"
	if(isImage(text)){
		pOpt = 'image'
	}else if(isComic(text)){
		pOpt = 'comic'
	}else if(isYouTube(text)){
		pOpt = 'youtube'
	}else if(isTwitter(text)){
		pOpt = 'twitter'
	}else if(isURL(text)){
		pOpt = 'url'
	}else if(text===""){
		pOpt = "empty"
	}
	return pOpt
}

function isImage(text: string) {
  return text.indexOf('content_image:::') === 0
}

function isComic(text: string) {
  return text.indexOf('content_comic:::') === 0
}

function isYouTube(text: string) {
  return (
    text.indexOf('https://youtu.be/') === 0 ||
    text.indexOf('https://www.youtube.com/') === 0
  )
}

function isTwitter(text: string) {
  return (
    text.indexOf('https://twitter.com/') === 0 ||
    text.indexOf('https://www.twitter.com/') === 0 ||
    text.indexOf('https://x.com/') === 0
  )
}

function isURL(text: string) {
  return text.indexOf('https://') === 0
}
