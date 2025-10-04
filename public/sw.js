// Service Worker for homepage optimization
const CACHE_NAME = 'home-optimization-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 静态资源缓存
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // 添加其他静态资源
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker 正在安装...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 缓存静态资源...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ 静态资源缓存完成');
        return self.skipWaiting(); // 立即激活新的SW
      })
      .catch((error) => {
        console.error('❌ 静态资源缓存失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker 正在激活...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ 旧缓存清理完成');
        return self.clients.claim(); // 立即接管所有客户端
      })
  );
});

// 获取事件 - 网络优先策略，失败时回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // API 请求 - 网络优先
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功的响应也缓存起来
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // 网络失败时尝试从缓存获取
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 返回离线页面或错误响应
              return new Response('网络离线，请稍后重试', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
    return;
  }

  // 页面请求 - 缓存优先
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request);
        })
    );
    return;
  }

  // 静态资源 - 缓存优先，网络回退
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // 缓存有效的响应
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // 对于图片请求，返回占位符
            if (request.destination === 'image') {
              return new Response(`
                <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="#f0f0f0"/>
                  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">
                    图片离线
                  </text>
                </svg>
              `, {
                headers: {
                  'Content-Type': 'image/svg+xml'
                }
              });
            }
          });
      })
  );
});

// 消息事件 - 用于与主线程通信
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: '1.0.0' });
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((names) => {
        Promise.all(
          names.map((name) => caches.delete(name))
        ).then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
      });
      break;
  }
});

// 推送通知处理（如果需要）
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification('健康中心', options)
    );
  }
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
