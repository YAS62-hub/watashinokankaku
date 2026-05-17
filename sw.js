const CACHE_NAME = 'se-app-v3'; // バージョン。変更すると更新が強制されます

self.addEventListener('install', (e) => {
    self.skipWaiting(); // 新しいバージョンを即座にインストール
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // 古いバージョンのキャッシュを削除
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim()) // 即座にコントロールを奪う
    );
});

self.addEventListener('fetch', (e) => {
    // ネットワーク・ファースト戦略（常に最新を取りに行き、オフライン時のみキャッシュを使う）
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // 取得に成功したらキャッシュを更新
                if (response && response.status === 200 && response.type === 'basic') {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, clonedResponse);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(e.request);
            })
    );
});
