// cache polyfill
// importScripts('/cache-polyfill.js');
// version
const VERSION = 1;
// cache name
const CACHE_NAME = `view-img-static-v${VERSION}`;

// install
self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/fallback.html',
                '/styles/app.css',
                '/scripts/app.js',
                '/images/husky.jpg',
                '/images/wolf.jpg',
                '/images/fallback.jpeg',
            ]);
        })
    );
});

// inercept
self.addEventListener('fetch', function (event) {
    // 获取请求
    let request = event.request;
    // 解析URL
    const url = new URL(request.url);
    // 如果请求的是'/images/wolf.jpg'，响应 '/images/husky.jpg'。
    if(url.origin === location.origin && url.pathname === '/images/wolf.jpg'){
        request = new Request('/images/husky.jpg');
    }

    event.respondWith(
        // 如果本地存在请求资源就直接响应，否则从网络获取。即缓存优先策略
        caches.match(request).then(async (response) => {
            return response || fetch(request).then(r => {
                if(response.status >= 400){
                    throw `${response.status}-${response.statusText}`
                }
                return r;
            }).catch((error) => {
                if ( event.request.mode === 'navigate' || req.method === 'GET' && req.headers.get('accept').includes('text/html')) {
                    return caches.match('/fallback.html');
                }
                throw error;
            })
        })
    );
});
