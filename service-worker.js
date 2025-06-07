/**
 * 项目倒计时应用的服务工作者
 * 用于缓存应用资源，实现离线访问功能
 */

// 缓存名称和版本
const CACHE_NAME = 'countdown-app-v1';

// 需要缓存的资源列表
const resourcesToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff2'
];

// 安装服务工作者
self.addEventListener('install', event => {
  // 跳过等待阶段，直接激活
  self.skipWaiting();
  
  // 缓存所需资源
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('打开缓存');
        return cache.addAll(resourcesToCache);
      })
  );
});

// 激活服务工作者
self.addEventListener('activate', event => {
  console.log('服务工作者已激活');
  
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 处理请求
self.addEventListener('fetch', event => {
  event.respondWith(
    // 优先使用缓存，如果缓存中没有则请求网络
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // 克隆请求
        const fetchRequest = event.request.clone();
        
        // 发起网络请求
        return fetch(fetchRequest)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应
            const responseToCache = response.clone();
            
            // 将响应缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
}); 