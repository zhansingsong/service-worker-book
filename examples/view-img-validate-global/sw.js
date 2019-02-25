const broadcast = (msg) => {
  self.clients.matchAll().then(clients => {
      if (clients && clients.length) {
      clients.forEach((client) => {
          client.postMessage(msg.join(', '));
      })
      }
  })
}
// cache polyfill
// importScripts('/cache-polyfill.js');
// version
const VERSION = 1;
// cache name
const CACHE_NAME = `view-img-static-v${VERSION}`;
// global variable
const variables = [];

// install.
self.addEventListener('install', function (e) {
    variables.push('install-event install');
    self.skipWaiting();// 每次只能运行一个sw版本
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles/app.css',
                '/scripts/app.js',
                '/images/husky.jpg',
                '/images/fox.jpg',
                '/images/husky2.jpg',
                '/images/wolf.jpg',
            ]);
        }).then((r) => {
            return r;
          })
    );
});


self.addEventListener('activate', event => {
  variables.push('install-event activate');
  event.waitUntil(clients.claim());
});

// inercept
self.addEventListener('fetch', function (event) {
    // 获取请求
    let request = event.request;
    // 解析URL
    const url = new URL(request.url);

    variables.push(url);
    // 如果请求的是'/images/wolf.jpg'，响应 '/images/husky.jpg'。
    // if(url.origin === location.origin && url.pathname === '/images/wolf.jpg'){
    //     request = new Request('/images/husky.jpg');
    // }

    event.respondWith(
        // 如果本地存在请求资源就直接响应，否则从网络获取。即缓存优先策略
        caches.match(request).then(function (response) {
            broadcast(variables);
            return response || fetch(request);
        })
    );
});
