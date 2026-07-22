const CACHE_NAME = 'se-app-v7'; // バージョン。変更すると更新が強制されます

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
    // 外部バックエンドAPI（kankaku-push-worker等）宛てのリクエスト、および非GETリクエストは
    // e.respondWith を一切呼ばずに return するだけ。
    // これによりSWは一切介入せず、ブラウザ本来のネットワークスタックで通信が処理される（完全パススルー）。
    // URLのサブドメインが変わっても確実にバイパスできるよう、Worker名（kankaku-push-worker）で判定する。
    if (e.request.method !== 'GET' || e.request.url.includes('kankaku-push-worker')) {
        return;
    }

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

// === プッシュ通知の受信と表示処理 ===
self.addEventListener('push', function(event) {
    // デフォルトのお守り言葉（サーバー側エラー時のフォールバック用）
    const defaultData = {
        title: 'わたしのかんかく',
        body: 'アプリは無理に開かなくて大丈夫です。もしよろしければ、今のあなたを感じる時間を少しだけとってみるのはいかがでしょうか。'
    };
    
    let data;
    try {
        data = event.data ? JSON.parse(event.data.text()) : defaultData;
    } catch(e) {
        data = defaultData;
        if(event.data) data.body = event.data.text();
    }
    
    const options = {
        body: data.body,
        icon: 'icon-512.png',
        badge: 'icon-512.png',
        vibrate: [100, 50, 100], // 優しい振動バイブレーション
        data: {
            url: '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'わたしのかんかく', options)
    );
});

// === 通知がタップされた時の処理 ===
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // アプリ（このサイト）を開く、または既に開かれていればフォーカスする
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
