# 实战 Service Worker

在实际生产中，对于小项目来说，手动维护一个 `sw.js` 脚本，成本在可接受范围内。但对于稍微复杂项目，手动维护可能就吃不消了。因为每次项目迭代，都需要重新编写 `sw.js`。加上如果项目需要维护资源较多，出错的几率增大。那有木有专门的自动化工具来替我们维护这个 `sw.js` 脚本呢？

答案肯定是有的。再讲解如何自动化维护 `sw.js` 脚本之前，先要了解一些概念。在搭建一个 PWA 时，一般会使用到 **App shell + Dynamic content** 模型，这是一种将应用逻辑与内容分离的架构。

## App shell

web app 的"壳"，类似于 native app 的安装包。包含了让 web app 离线运行的所有静态资源。如 html、css、js、image 等。如果站点完全是静态的，这个"壳"就是应用的所有静态资源了。

## Dynamic content

动态内容是使用 JavaScript 通过网络获取的。如 API 数据。
![](https://developers.google.com/web/fundamentals/architecture/images/appshell.png)

了解 **App shell + Dynamic content** 架构后。针对 **App shell** 和 **Dynamic content** 可以分别使用如下如模块进行处理：

## [sw-precache](https://github.com/GoogleChromeLabs/sw-precache)

> A node module to generate Service Worker code that will precache specific resources so they work offline.

一个用于生成预缓存特定资源的 Service Worker 文件的 node 模块。它除了可以生成 Service Worker 文件外，还可以预缓存资源。很适合用来处理 **App shell**。

缓存最大的问题是如何保障缓存资源是最新的同时，还要确保冗余资源的回收。sw-precache 为了跟踪每个要缓存的资源，会根据每个资源的内容生成一个 hash 值。然后将每个资源的版本 hash 值与 URL 保存在 Service Worker 文件中。再对预缓存的资源使用 [cache-first](https://googlechromelabs.github.io/sw-toolbox/api.html#toolboxcachefirst) 策略进行缓存。这样就可以确保当某个预缓存资源发生改变时，无需更新全部资源，只需更新变化的资源即可。另外，sw-precache 也可以与 [sw-toolbox](https://github.com/GoogleChrome/sw-toolbox) 协同工作。使用 sw-precache 提供`runtimeCaching`配置项，可让 [sw-toolbox](https://github.com/GoogleChrome/sw-toolbox) 与 sw-precache 协同工作。

## [sw-toolbox](https://github.com/GoogleChrome/sw-toolbox)

为了对 **Dynamic content** 做到更精细的控制。sw-toolbox 提供了一种基于路由应用不同缓存策略的使用方式。同时它还通过 [IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API) 提供了 `cache.maxEntries` 和 `cache.maxAgeSeconds` 缓存选项，可控制缓存项的数量和缓存有效期。当然它也提供预缓存功能。不过与 sw-precache 相比，在对预缓存处理上 sw-toolbox 显得有些粗暴。因为每次 Service Worker 文件的更新，都会将之前预缓存资源全部删除，然后重新下载缓存。[更多关于 sw-toolbox 详情](https://googlechromelabs.github.io/sw-toolbox/api.html#main)。

- 路由

  - Express-style Routes
  - Regular Expression Routes

- 缓存策略

  - toolbox.networkFirst
  - toolbox.cacheFirst
  - toolbox.fastest
  - toolbox.cacheOnly
  - toolbox.networkOnly

更多关于 sw-precache 与 sw-toolbox 的关系，可以参考：[sw-precache? sw-toolbox? What's the difference?](https://github.com/GoogleChromeLabs/sw-precache/blob/master/sw-precache-and-sw-toolbox.md)

## 自动生成 Service Worker 文件

要实现自动化生成 Service Worker 文件，这就得借助自动化构建工具，如 [webpack](https://webpack.js.org/)、[rollup](https://rollupjs.org/guide/en)、[gulp](https://gulpjs.com/) 等。这里以 webpack 为例讲解。上文已介绍 sw-precache 除了可以生成 Service Worker 文件外，同时具备处理 **App shell** 和 **Dynamic content** 的能力。官方也提供了基于 webpack 的插件：[sw-precache-webpack-plugin](https://www.npmjs.com/package/sw-precache-webpack-plugin)。这是个 webpack 插件，配合 sw-precache 自动生成 Service Worker 文件。webpack 在打包时，会根据依赖树生成项目所依赖的静态资源，这些都是预缓存资源。该插件会在 webpack 触发 `emit` 后，从编译对象上获取这些信息，并将其注入到 sw-precache 中。

如下是我个人 blog 站点的 sw-precache-webpack-plugin 插件的配置信息：

```js
 new SWPrecacheWebpackPlugin({
    staticFileGlobs: ['publics/favicon.ico', 'publics/service-worker-registration.js'],
    mergeStaticsConfig: true,
    // Brute force server worker routing:
    // Tell the Service Worker to use /shell for all navigations.
    // E.g. A request for /guides/12345 will be fulfilled with /shell
    navigateFallback: '/',
    stripPrefix: 'publics',
    dynamicUrlToDependencies: {},
    fakeDynamicUrlToDependencies:
      {
        'index.html': '/index',
        'archives.html': '/archives',
        'tags.html': '/tags',
        'about.html': '/about',
        'categories.html': '/categories',
        'articles.html': '/articles',
        'offline.html': '/offline',
        '404.html': '/404',
      },
    // API Updates: https://github.com/GoogleChromeLabs/sw-toolbox/issues/98
    runtimeCaching: [
      {
        urlPattern: /\.(png|jpeg|jpg|webp|gif)/,
        handler: 'cacheFirst',
        options: {
          cache: {
            name: `imgs-cache-v${SW_VERSION}`,
            maxEntries: 50,
          },
        },
      },
      {
        urlPattern: '/api/github/(.*)',
        handler: function(req, vals, opts) { // eslint-disable-line
          return toolbox.fastest(req, vals, opts).catch(function(error) { // eslint-disable-line
            self.sendMessageToClients('/offline'); // eslint-disable-line
            throw error;
          });
        },
        options: {
          cache: {
            name: `apis-cache-v${SW_VERSION}`,
            // Use sw-toolbox's LRU expiration.
            maxEntries: 50,
            maxAgeSeconds: 86400,
          },
        },
      },
      {
        urlPattern: '/api/(.*)',
        handler: function(req, vals, opts) { // eslint-disable-line
          return toolbox.networkFirst(req, vals, opts).catch(function(error) { // eslint-disable-line
            self.sendMessageToClients('/offline'); // eslint-disable-line
            throw error;
          });
        },
        options: {
          cache: {
            name: `apis-cache-v${SW_VERSION}`,
            // Use sw-toolbox's LRU expiration.
            maxEntries: 50,
            maxAgeSeconds: 86400,
          },
        },
      },
      {
        urlPattern: '/articles/:article',
        handler: function(req, vals, opts) { // eslint-disable-line
          return toolbox.networkFirst(req, vals, opts).catch(function(error) { // eslint-disable-line
            if (req.method === 'GET' && req.headers.get('accept').includes('text/html')) {
              return toolbox.cacheOnly(new Request(urlsToCacheKeys.get(`${self.location.origin}/offline`)), vals, { cache: {name: cacheName} });
            }
            throw error;
          });
        },
      },
      {
        default: 'toolbox.networkFirst',
      },
    ],
    // By default, a cache-busting query parameter is appended to requests
    // used to populate the caches, to ensure the responses are fresh.
    // If a URL is already hashed by Webpack, then there is no concern
    // about it being stale, and the cache-busting can be skipped.
    dontCacheBustUrlsMatching: /\.\w{8}\./,
    filename: 'service-worker.js',
    minify: true,
    // For unknown URLs, fallback to the index page
    // navigateFallback: publicUrl + '/index.html',
    // Ignores URLs starting from /__ (useful for Firebase):
    // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
    navigateFallbackWhitelist: [/^(?!\/__).*/],
    // Don't precache sourcemaps (they're large) and build asset manifest:
    staticFileGlobsIgnorePatterns: [/\.html$/, /\.map$/, /asset-manifest\.json$/],
  }),
```

这里对关键代码做一下讲解：

```js
staticFileGlobs: ['publics/favicon.ico', 'publics/service-worker-registration.js'],
mergeStaticsConfig: true,
```

`staticFileGlobs` 配置项主要用来增加外部预缓存资源。因为可能存在有些想要预缓存的资源没在 webpack 处理范围内。这里还需要配合 `mergeStaticsConfig: true` 一起使用。不然只会缓存 `staticFileGlobs` 指定的资源，而忽略掉 webpack 生成的资源。

```js
dynamicUrlToDependencies: {},
fakeDynamicUrlToDependencies:
  {
    'index.html': '/index',
    'archives.html': '/archives',
    'tags.html': '/tags',
    'about.html': '/about',
    'categories.html': '/categories',
    'articles.html': '/articles',
    'offline.html': '/offline',
    '404.html': '/404',
  },
```

`dynamicUrlToDependencies` 配置项是用来指定一个 URL 到 URL 内容所依赖的文件、字符串、buffer 的映射。简单点说，就预缓存 URL。前提是当 URL 内容发生改变时，预缓存的内容也要得到更新。而 URL 的内容是否发生变化直接与所依赖的文件、字符、buffer 有关。如：

```js
dynamicUrlToDependencies: {
'/pages/home': ['layout.jade', 'home.jade']
}
```

`'/pages/home'` 的内容是由模板文件 `'layout.jade'` 和 `'home.jade'` 共同决定。sw-precache 会读取 `'layout.jade'` 和 `'home.jade'` 文件生成一个 hash 值，这个 hash 值决定了 `'/pages/home'` 是否发生变化。其处理方式与 sw-precache 处理预缓存是一样的。

这里有个问题：依赖的模板文件过多维护起来不是很方便；而如果不列举完所依赖的模板文件，URL 是发生变化就无法得到保障。所以这里自己对插件做一些定制，通过 `fakeDynamicUrlToDependencies` 去生成 `dynamicUrlToDependencies`。 `fakeDynamicUrlToDependencies` 指定 HTML 文件到 URL 的映射关系，插件会根据 `fakeDynamicUrlToDependencies` 从 webpack 中获取对应的 HTML 文件字符串。然后使用字符串与 URL 生成 `dynamicUrlToDependencies`。

```js
runtimeCaching: [
  /* sw-toolbox 配置 */
];
```

`runtimeCaching` 配置项是用来配置 **sw-toolbox** 的使用。要使用好 **sw-toolbox**。关键是对缓存策略合理应用。

```js
{
  urlPattern: /\.(png|jpeg|jpg|webp|gif)/,
  handler: 'cacheFirst',
  options: {
    cache: {
      name: `imgs-cache-v${SW_VERSION}`,
      maxEntries: 50,
    },
  },
},
```

图片资源很少发生变化，所以使用了 `cacheFirst` 缓存策略，并缓存在单独的 cache 中，同时对缓存想数量做了最大 50 条的限制。但对于请求接口就不能使用 `cacheFirst` 缓存策略，因为它对实时性要求比较高。

`name: 'imgs-cache-v${SW_VERSION}'`，这里在命名中使用版本变量 `SW_VERSION`。为什么要这样处理？当使用单独的缓存来保存资源时，即不使用 sw-toolbox 默认缓存。这种情况需要开发者自己维护这个缓存。增加版本号，主要方便删除老版本的缓存。

```js
{
  urlPattern: '/api/(.*)',
  handler: function(req, vals, opts) { // eslint-disable-line
    return toolbox.networkFirst(req, vals, opts).catch(function(error) { // eslint-disable-line
      self.sendMessageToClients('/offline'); // eslint-disable-line
      throw error;
    });
  },
  options: {
    cache: {
      name: `apis-cache-v${SW_VERSION}`,
      // Use sw-toolbox's LRU expiration.
      maxEntries: 50,
      maxAgeSeconds: 86400,
    },
  },
},
{
  urlPattern: '/api/github/(.*)',
  handler: function(req, vals, opts) { // eslint-disable-line
    return toolbox.fastest(req, vals, opts).catch(function(error) { // eslint-disable-line
      self.sendMessageToClients('/offline'); // eslint-disable-line
      throw error;
    });
  },
  options: {
    cache: {
      name: `apis-cache-v${SW_VERSION}`,
      // Use sw-toolbox's LRU expiration.
      maxEntries: 50,
      maxAgeSeconds: 86400,
    },
  },
},
```

`'/api/(.*)'` 接口使用了 `networkFirst` 缓存策略，这种策略会让每次对`'/api/(.*)'`的请求，都会直接从网络获取。因为可能存在网络请求失败情况，为了提高用户体验，这里对请求失败的情况做了回退处理。只要请求一失败，会通知客户端直接跳转到预缓存`'/offlline'`页面。

而 `'/api/github/(.*)'` 接口却使用了`fastest`策略。因为这个接口更新不是很频繁，对实时性要求不是很高。

```js
{
  urlPattern: '/articles/:article',
  handler: function(req, vals, opts) { // eslint-disable-line
    return toolbox.networkFirst(req, vals, opts).catch(function(error) { // eslint-disable-line
      if (req.method === 'GET' && req.headers.get('accept').includes('text/html')) {
        return toolbox.cacheOnly(new Request(urlsToCacheKeys.get(`${self.location.origin}/offline`)), vals, { cache: {name: cacheName} });
      }
      throw error;
    });
  },
},
{
  default: 'toolbox.networkFirst',
},
```

另外，对 `'/articles/:article'` 请求页面也做缓存处理。如果页面获取失败直接响应 `'offline'` 。其他就使用 `default: 'toolbox.networkFirst'` 默认缓存策略。最后生成的代码：

```js
toolbox.router.get(/\.(png|jpeg|jpg|webp|gif)/, toolbox.cacheFirst, {"cache":{"name":"imgs-cache-v1","maxEntries":50}});
toolbox.router.get("/api/github/(.*)", function handler(req, vals, opts) {
      // eslint-disable-line
      return toolbox.fastest(req, vals, opts).catch(function (error) {
        // eslint-disable-line
        self.sendMessageToClients('/offline'); // eslint-disable-line
        throw error;
      });
    }, {"cache":{"name":"apis-cache-v1","maxEntries":50,"maxAgeSeconds":86400}});
toolbox.router.get("/api/(.*)", function handler(req, vals, opts) {
      // eslint-disable-line
      return toolbox.networkFirst(req, vals, opts).catch(function (error) {
        // eslint-disable-line
        self.sendMessageToClients('/offline'); // eslint-disable-line
        throw error;
      });
    }, {"cache":{"name":"apis-cache-v1","maxEntries":50,"maxAgeSeconds":86400}});
toolbox.router.get("/articles/:article", function handler(req, vals, opts) {
      // eslint-disable-line
      return toolbox.networkFirst(req, vals, opts).catch(function (error) {
        // eslint-disable-line
        if (req.method === 'GET' && req.headers.get('accept').includes('text/html')) {
          return toolbox.cacheOnly(new Request(urlsToCacheKeys.get(self.location.origin + '/offline')), vals, { cache: { name: cacheName } });
        }
        throw error;
      });
    }, {});
toolbox.router.default = toolbox.networkFirst;
```
> singsong: 如何使用好缓存策略，这是对开发人员的考验。
完整的 Service Worker 文件代码：[猛击这里查看](./service-worker.js)

除了可以使用 sw-precache 和 sw-toolbox 生成 Service Worker 文件外。还可以使用 Workbox。

## [Workbox](https://developers.google.com/web/tools/workbox/)
> Workbox is a library that bakes in a set of best practices and removes the boilerplate every developer writes when working with service workers.

它是一个提供了一序列使用 Service Worker 最佳实践的集合库。Workbox 基于功能细划模块，减小冗余代码同时也提高了模块复用性，在使用上与 sw-precache 和 sw-toolbox 相比，Workbox 更加灵活。
Workbox 除了具备 sw-precache 和 sw-toolbox 功能外。它还拥有 **Background sync**、**Helpful debugging** 等功能。另外，Workbox 与 sw-precache 和 sw-toolbox 都是同一个开发团队推出的，都是为了解决更好地使用 Service Worker。[更多关于 Workbox](https://developers.google.com/web/tools/workbox/reference-docs/latest/)。