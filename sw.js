const CACHE_NAME = 'se-app-v8'; // バージョン。変更すると更新が強制されます

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

    // 声の案内（audio/ の下）も素通しにする。
    // ★音声は「途中から少しずつ取る」取り方（Range）で読まれる。SWを挟むと、
    //   iPhone では再生できない・途中に飛べないことがあるため、ブラウザに任せる。
    //   ★そのぶん、声の案内はオフラインでは聴けない（キャッシュに入らない）
    if (new URL(e.request.url).pathname.includes('/audio/')) {
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

    // 狙いは 2026-09-10 のご判断のまま「通知をタップしたら、いつでも必ずアプリを開く」。
    // 変えたのは、その狙いに届くまでの道を2本にしたこと。
    //
    //   〜2026-08-26   前に出す（focus）だけ  … 前に出せないと、行き先が無い
    //   2026-09-10〜   新しく開く（openWindow）だけ … 失敗すると、行き先が無い
    //   2026-09-16〜   前に出す → だめなら新しく開く … 行き止まりを両方ふさぐ
    //
    // ★iPhone では、アプリが後ろで動いたままのとき openWindow が失敗することがあり、
    //   逆にアプリを終了させたあとは、前に出す相手（窓）が無い。
    //   どちらの場面でも、どこかへ必ずたどり着くようにしている。
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil((async () => {
        // 道その1：すでに開いている窓があれば、それを前に出す
        try {
            const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of windows) {
                if ('focus' in client) {
                    const focused = await client.focus();
                    if (focused) return focused;
                }
            }
        } catch (e) {
            // 前に出せなかった。下の「道その2」へ進む（ここで終わらせない）
        }

        // 道その2：窓が無い／前に出せなかったときは、新しく開く
        if (clients.openWindow) {
            try {
                return await clients.openWindow(targetUrl);
            } catch (e) {
                // ここまで来たら、これ以上できることは無い
            }
        }
    })());
});
