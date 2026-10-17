// Offline support for the builder itself: precache the app shell on install,
// serve it from cache when offline. Model files (Phase 2) use their own cache.

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';
import { self } from '$app/service-worker';

const CACHE = `app-shell-${version}`;
const SHELL = [...immutable, ...assets, ...prerendered].map((f) => f.path);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith('app-shell-') && k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	const url = new URL(request.url);
	if (request.method !== 'GET' || url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// Hashed build files never change: cache first.
			if (immutable.some((f) => url.pathname.endsWith(f.path))) {
				const hit = await cache.match(request);
				if (hit) return hit;
			}
			// Everything else: network first so updates arrive, cache when offline.
			try {
				const response = await fetch(request);
				if (response.ok && response.type === 'basic') cache.put(request, response.clone());
				return response;
			} catch {
				// Pages like /editor?id=… are the same prerendered shell regardless of query.
				const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
				if (hit) return hit;
				throw new Error('Offline and not cached');
			}
		})()
	);
});
