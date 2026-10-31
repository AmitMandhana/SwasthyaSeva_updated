self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/_next/static/')) {
    event.respondWith(fetch(event.request, { cache: 'reload' }));
  }
});
