/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 * KV Namespace: https://developers.cloudflare.com/workers/runtime-apis/kv/
 */

interface Env {
	open_heart_kv: KVNamespace;
}

function ensureEmoji(emoji: string) {
	const segments = Array.from(new Intl.Segmenter().segment(emoji.trim()));
	const parsedEmoji = segments.length > 0 ? segments[0].segment : null;

	if (/\p{Emoji}/u.test(parsedEmoji!)) {
		return parsedEmoji;
	}
	return null;
}

// derived from https://gist.github.com/muan/388430d0ed03c55662e72bb98ff28f03
export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const id = url.searchParams.get('id');

		// Get: return count
		if (request.method === 'GET') {
			if (!id) return new Response('ID not found', { status: 200 });

			const emoji = await env['open_heart_kv'].get(id);
			if (emoji) {
				const count = Number(await(env['open_heart_kv'].get(`${id}:${emoji}`)) || 0);
				return Response.json({
					[emoji]: count,
				});
			} else {
				return new Response('emoji not found');
			}
		}

		if (request.method !== 'POST') return new Response('Wrong Method!');

		// POST: add count
		const emoji = ensureEmoji(await request.text());

		if (!id || !emoji) return new Response('Input not found');

		const key = `${id}:${emoji}`;
		const val = await env['open_heart_kv'].get(id);
		if (!val || val !== emoji) {
			await env['open_heart_kv'].put(id, emoji);
		}

		const currentCount = Number(await(env['open_heart_kv'].get(key)) || 0);
		await env['open_heart_kv'].put(key, (currentCount + 1).toString());

		return new Response('ok', { status: 200 });
	},
} satisfies ExportedHandler<Env>;
