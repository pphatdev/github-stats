type WorkerEnv = {
    UPSTREAM_ORIGIN?: string;
};

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
        },
    });
}

export default {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
        const configuredOrigin = (env.UPSTREAM_ORIGIN || '').trim();

        if (!configuredOrigin) {
            return jsonResponse(
                {
                    error: 'UPSTREAM_ORIGIN is not configured',
                    message:
                        'Set UPSTREAM_ORIGIN in your Wrangler env vars to the Node API origin, for example https://api.example.com',
                },
                500,
            );
        }

        const incomingUrl = new URL(request.url);
        const upstreamBase = new URL(configuredOrigin.endsWith('/') ? configuredOrigin : `${configuredOrigin}/`);
        const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstreamBase);

        const headers = new Headers(request.headers);
        headers.set('x-forwarded-host', incomingUrl.host);
        headers.delete('host');

        const init: RequestInit = {
            method: request.method,
            headers,
            redirect: 'manual',
            body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        };

        return fetch(upstreamUrl.toString(), init);
    },
};
