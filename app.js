document.addEventListener('DOMContentLoaded', () => {
    console.log('App v10.1.0 starting (20260730_fix2)...');
    // === 要素の取得 ===
    const tabs = document.querySelectorAll('.tab-content');
    const navItems = document.querySelectorAll('.nav-item');
    const stateButtons = document.querySelectorAll('.state-button');
    const dailyMemo = document.getElementById('dailyMemo');
    
    // 設定関連
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const popupToggle = document.getElementById('popupToggle');
    
    // 通知設定関連
    const pushNotificationToggle = document.getElementById('pushNotificationToggle');
    const pushNotificationDetails = document.getElementById('pushNotificationDetails');
    const customScheduleArea = document.getElementById('customScheduleArea');
    const customPresetBtn = document.getElementById('customPresetBtn');
    const presetBtns = document.querySelectorAll('.preset-btn[data-preset]');
    const dayBtns = document.querySelectorAll('.day-btn');
    const customTimeInput = document.getElementById('customTimeInput');
    const customPushMessage = document.getElementById('customPushMessage');
    const savePushNotificationBtn = document.getElementById('savePushNotificationBtn');
    const customMessageToggle = document.getElementById('customMessageToggle');
    const customMessageArea = document.getElementById('customMessageArea');
    const testPushBtn = document.getElementById('testPushBtn');

    // ポップアップ設定用
    const savePopupSettingBtn = document.getElementById('savePopupSettingBtn');

    // ▼ Web Push用設定（本番） ▼
    const PUBLIC_VAPID_KEY = 'BM3cP2snk75QJ6OlTK2dMRSUmKyivtGqBq9wqhP34FhJ1rNJ_umuTDp8_4SEyHh5ncCbNjKeoPH_JdIsXWTUBSo';
    const WORKER_URL = 'https://kankaku-push-worker.manayui.workers.dev';
    // ▲ ▲
    
    // カスタマイズ関連
    const customHigh = document.getElementById('customHigh');
    const customMid = document.getElementById('customMid');
    const customLow = document.getElementById('customLow');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    
    // ボタンのテキスト要素
    const textHigh = document.querySelector('.state-high .text');
    const textMid = document.querySelector('.state-mid .text');
    const textLow = document.querySelector('.state-low .text');
    
    // トースト（ポップアップ）関連
    const toastMessage = document.getElementById('toastMessage');
    const toastText = document.getElementById('toastText');
    const toastClose = document.getElementById('toastClose');
    
    // リソース関連
    const resourceNote = document.getElementById('resourceNote');
    const photoArea = document.getElementById('photoArea');
    const photoInput = document.getElementById('photoInput');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    const photoPreview = document.getElementById('photoPreview');

    // 記録フォーム関連
    const recordTimeInput = document.getElementById('recordTime');
    const submitRecordBtn = document.getElementById('submitRecordBtn');
    let selectedRecordType = null;
    
    // 編集モーダル関連
    const editRecordModal = document.getElementById('editRecordModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editRecordTime = document.getElementById('editRecordTime');
    const editRecordMemo = document.getElementById('editRecordMemo');
    const editRecordId = document.getElementById('editRecordId');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const editZoneBtns = document.querySelectorAll('.edit-zone-group .state-button');
    let editSelectedType = null;
    
    // 日時の初期化
    function setNowToInput(inputEle) {
        if (!inputEle) return;
        const now = new Date();
        const offsetNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        inputEle.value = offsetNow.toISOString().slice(0, 16);
    }
    
    // 汎用的なゾーン変換関数（数値や古い文字列をhigh/mid/lowに正規化）
    function getZone(type) {
        let val = type;
        if (!isNaN(parseInt(val))) {
            const v = parseInt(val);
            if (v > 65) return 'high';
            if (v < 35) return 'low';
            return 'mid';
        }
        return String(val); // 'high', 'mid', 'low' 等
    }
    
    setNowToInput(recordTimeInput);

    // === 初期設定の読み込み ===
    // 0. カスタムラベルの読み込みと適用
    const defaultLabels = {
        high: 'ハイ（たかぶり・ざわざわ）',
        mid: '大丈夫（ほどほど・リラックス）',
        low: 'ロー（おもい・とおい）'
    };
    
    function loadLabels() {
        // 先程の強制消去ロジックを取り下げ、正常なlocalStorageの読み込みを復旧
        const savedLabels = JSON.parse(localStorage.getItem('seAppLabels') || 'null');
        let labels = defaultLabels;
        
        if (savedLabels) {
             // 以前の不具合で残った古いデフォルト「活発・マシ」などが完全一致で入っていたら棄却する安全策
             if (savedLabels.high === 'ハイ（活発・たかぶり・ざわざわ）') {
                  localStorage.removeItem('seAppLabels');
             } else {
                  labels = savedLabels;
             }
        }
        
        // ホーム画面・編集画面の両方のボタンテキストを更新
        const textHighEls = document.querySelectorAll('.state-high .text');
        const textMidEls = document.querySelectorAll('.state-mid .text');
        const textLowEls = document.querySelectorAll('.state-low .text');
        
        if (textHighEls) textHighEls.forEach(el => el.textContent = labels.high);
        if (textMidEls) textMidEls.forEach(el => el.textContent = labels.mid);
        if (textLowEls) textLowEls.forEach(el => el.textContent = labels.low);
        
        // 設定フォームに適用
        if (customHigh) customHigh.value = labels.high;
        if (customMid) customMid.value = labels.mid;
        if (customLow) customLow.value = labels.low;
    }
    loadLabels();

    // 1. ポップアップのON/OFF
    const savedToggle = localStorage.getItem('seAppToggle');
    if (savedToggle !== null) {
        popupToggle.checked = savedToggle === 'true';
    }

    // 2. リソース箱マイグレーションと読み込み
    let seAppResources = [];
    try {
        seAppResources = JSON.parse(localStorage.getItem('seAppResources') || '[]');
    } catch(e) {
        console.error('データの読み込みに失敗しました', e);
        seAppResources = [];
    }
    
    // アプリ起動時にローディング画面を確実にオフにする安全装置
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('active');
    
    const savedNote = localStorage.getItem('seAppNote');
    const savedPhoto = localStorage.getItem('seAppPhoto');
    
    // 古いデータがあれば新しい配列の最初に移行して削除
    if (savedNote || savedPhoto) {
        seAppResources.unshift({
            id: Date.now().toString(36),
            text: savedNote || '',
            photoStr: savedPhoto || '',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('seAppResources', JSON.stringify(seAppResources));
        localStorage.removeItem('seAppNote');
        localStorage.removeItem('seAppPhoto');
    }

    // === タブ切り替え ===
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // タブメニューのactive切り替え
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // コンテンツのactive切り替え
            const targetId = item.getAttribute('data-target');
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === targetId) {
                    tab.classList.add('active');
                }
            });
            
            // タブを切り替えたらトーストを消す
            hideToast();
        });
    });

    // === 状態の記録とポップアップ ===
    
    const AUTO_MESSAGES_POOL = {
        '100': [
            '一生懸命に状況に対処しようとしている身体からの大切なメッセージかもしれません。もしよければ、ゆっくり10回足踏みをして、足の裏の感覚に気づいてみませんか？（スローダウン）',
            'あなたの大切な反応は、身体があなたを守ろうと頑張っている証拠です。今は少しだけ、お水を一口飲んでひと息ついてみませんか？（ヘルプ・ナウ！）',
            'もし今、身体の中に強いエネルギーやざわつきを感じているなら、それはあなたを守ろうとシステムが一生懸命に働いているサインかもしれません。',
            '身体がキュッと張り詰めている時は、少しだけ視線を上げて、部屋の中にある『四角いもの』を3つ、ゆっくり見つけてみませんか？',
            '行き場のないエネルギーを感じたら、もしできれば、壁を両手でギュッと押して筋肉に力を入れてみてください。少しだけ外に逃がしてあげましょう。',
            '圧倒されるような感覚を、記録してくれましたね。今はただ、安全な場所でやり過ごすだけで十分です。',
            'もし、息苦しさなどがあれば、お腹の奥底から「ヴーーー」と低い声（音）を長く吐き出してみませんか？お腹の振動を感じてみましょう。',
            'もしよろしければ、ご自身の腕や足を「ポンポン」と優しく叩いたり、少しギュッとさすったりして、身体の輪郭を確かめてみませんか？',
            '少しだけ奥歯に力を入れたりゆるめたり、口をぽかんと開けてみるのはどうでしょう。しばらく繰り返すとどんなことに気がつきますか？',
            'もしよろしければ、一度つま先立ちをしてから、かかとを「トン、トン、トン…」と床に下ろす動きを数回繰り返してみませんか？',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '85': [
            '一生懸命に状況に対処しようとしている身体からの大切なメッセージかもしれません。もしよければ、ゆっくり10回足踏みをして、足の裏の感覚に気づいてみませんか？（スローダウン）',
            'あなたの大切な反応は、身体があなたを守ろうと頑張っている証拠です。今は少しだけ、お水を一口飲んでひと息ついてみませんか？（ヘルプ・ナウ！）',
            'もし今、身体の中に強いエネルギーやざわつきを感じているなら、それはあなたを守ろうとシステムが一生懸命に働いているサインかもしれません。',
            '身体がキュッと張り詰めている時は、少しだけ視線を上げて、部屋の中にある『四角いもの』を3つ、ゆっくり見つけてみませんか？',
            '行き場のないエネルギーを感じたら、もしできれば、壁を両手でギュッと押して筋肉に力を入れてみてください。少しだけ外に逃がしてあげましょう。',
            '張り詰めている感覚に意識が向いていますね。もしよければ、部屋の中で「青いもの」を一つ探してみるのも助けになるかもしれません。',
            '頭の中が忙しい時などは、100から順番に「3つずつ数字を引いて」数えてみませんか？（100、97、94…）',
            '息苦しさを感じるような時は、お腹の奥底から「ヴーーー」と低い声（音）を長く吐き出してみませんか？お腹の振動を感じてみましょう。',
            'もしよろしければ、ご自身の腕や足を「ポンポン」と優しく叩いたり、少しギュッとさすったりして、身体の輪郭を確かめてみませんか？',
            '少しだけ奥歯に力を入れたりゆるめたり、口をぽかんと開けてみるのはどうでしょう。しばらく繰り返すとどんなことに気がつきますか？',
            'フワフワする時は、一度つま先立ちをしてから、かかとを「トン」と床に下ろす動きを数回繰り返してみませんか？',
            'もしよろしければ、一度つま先立ちをしてから、かかとを「トン、トン、トン…」と床に下ろす動きを数回繰り返してみませんか？',
            '座ったまま、海藻のように身体をゆっくり左右に揺らしてみませんか？背骨の滑らかな動きを感じてみましょう。',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '65': [
            'ほどよく活気あるエネルギーが、あなたの中にありますね。その心地よい熱量を、ぜひ味わってみてください。',
            '少しだけ奥歯に力を入れたりゆるめたり、口をぽかんと開けてみるのはどうでしょう。しばらく繰り返すとどんなことに気がつきますか？',
            'フワフワする時は、一度つま先立ちをしてから、かかとを「トン」と床に下ろす動きを数回繰り返してみませんか？',
            '座ったまま、海藻のように身体をゆっくり左右に揺らしてみませんか？背骨の滑らかな動きを感じてみましょう。',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '50': [
            '今、この瞬間に、静かに留まっていますね。その「おだやかさ」は、身体のどのあたりで一番感じますか？',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '35': [
            '優しい休息の空気が流れているようですね。あなたのシステムが、ゆっくり充電されていくのを許してあげてください。',
            '座ったまま、海藻のように身体をゆっくり左右に揺らしてみませんか？背骨の滑らかな動きを感じてみましょう。',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '15': [
            '今は何も感じない・感じづらくすることであなたを守る、大切な冬眠のような時間かもしれません。無理に動かず、重力に身体を預けてみてください。',
            'バタンキューと休むことも、生き残るための立派な防衛反応です。時に「何もしないこと」もあなたの大切な意図的な選択だと感じます。今のあなたを、まずは労ってあげてくださいね。',
            '身体が重く感じたり、動きたくないような時は、システムがあなたを休ませようとしている大切な『冬眠』の時間かもしれません。',
            'もし感覚が遠く感じられても、それは生き残るための立派な防衛反応です。無理に引き上げず、今は重力に身体を預けてみてください。',
            'エネルギーが底をつきそうな時は、何もしないことを選択しても大丈夫です。温かい毛布にくるまるなどして、まずは安全を確保してくださいね。',
            '感覚の変化を丁寧にキャッチしていますね。もしよければ、足の裏や背中、お尻などが「床や背もたれ、座面、壁などに支えられている感覚」があるかどうか、ゆっくり感じてみませんか。また、わからない、感じない、というのも大事な感覚です。',
            '遠く感じる時などは、少し視線を動かして、部屋の中にある『温かそうな色のもの』を1つ、目で触るように眺めてみませんか？',
            '身体の重さを感じる時などは、お腹の奥底から「ヴーーー」と低い声（音）を長く吐き出してみませんか？お腹の振動を感じてみましょう。',
            'もしよろしければ、ご自身の腕や足を「ポンポン」と優しく叩いたり、少しギュッとさすったりして、身体の輪郭を確かめてみませんか？',
            'もしよければ、両手でご自身をギュッと抱きしめて（セルフハグ）、ご自身の身体の温かさを少しだけ味わってみませんか？',
            'もしよろしければ、一度つま先立ちをしてから、かかとを「トン、トン、トン…」と床に下ろす動きを数回繰り返してみませんか？',
            '座ったまま、海藻のように身体をゆっくり左右に揺らしてみませんか？背骨の滑らかな動きを感じてみましょう。',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ],
        '0': [
            '今は何も感じない・感じづらくすることであなたを守る、大切な冬眠のような時間かもしれません。無理に動かず、重力に身体を預けてみてください。',
            'バタンキューと休むことも、生き残るための立派な防衛反応です。時に「何もしないこと」もあなたの大切な意図的な選択だと感じます。今のあなたを、まずは労ってあげてくださいね。',
            '身体が重く感じたり、動きたくないような時は、システムがあなたを休ませようとしている大切な『冬眠』の時間かもしれません。',
            'もし感覚が遠く感じられても、それは生き残るための立派な防衛反応です。無理に引き上げず、今は重力に身体を預けてみてください。',
            'エネルギーが底をついている時は、何もしないことを選択して大丈夫です。温かい毛布にくるまるなどして、まずは安全を確保してくださいね。',
            '圧倒されるような感覚を、記録してくれましたね。今はただ、安全な場所でやり過ごすだけで十分です。',
            '感覚の変化を丁寧にキャッチしていますね。もしよければ、足の裏や背中、お尻などが「床や背もたれ、座面、壁などに支えられている感覚」があるかどうか、ゆっくり感じてみませんか。また、わからない、感じない、というのも大事な感覚です。',
            'あなたのシステムが、あなたを懸命に守ろうとしているサインかもしれません。今は無理に動かず、ただ安全な場所で休むことをご自身に許してあげてくださいね。',
            '遠く感じる時などは、少し視線を動かして、部屋の中にある『温かそうな色のもの』を1つ、目で触るように眺めてみませんか？',
            '身体の重さを感じる時などは、お腹の奥底から「ヴーーー」と低い声（音）を長く吐き出してみませんか？お腹の振動を感じてみましょう。',
            'もしよろしければ、ご自身の腕や足を「ポンポン」と優しく叩いたり、少しギュッとさすったりして、身体の輪郭を確かめてみませんか？',
            'もしよければ、両手でご自身をギュッと抱きしめて（セルフハグ）、ご自身の身体の温かさを少しだけ味わってみませんか？',
            'もしよろしければ、一度つま先立ちをしてから、かかとを「トン、トン、トン…」と床に下ろす動きを数回繰り返してみませんか？',
            '座ったまま、海藻のように身体をゆっくり左右に揺らしてみませんか？背骨の滑らかな動きを感じてみましょう。',
            '今、身体の中で「一番マシなところ」「少しだけ楽なところ」はどこですか？そこに少しだけ、好奇心を向けてみましょう。',
            'あなたの心の中にある「安全なリソース箱（宝箱）」を開けて、一番お気に入りのものを一つ、頭の中で眺めてみませんか？',
            '「リソース箱（宝箱）」を開けて、今お気に召すものを一つ、眺めてみたり、実際にしてみたりするのはどうでしょうか？'
        ]
    };

    const PALETTE_GROUPS = [
        { score: 100, title: 'すごくハイ（ゾーンの外）', words: ['しゅぽしゅぽと機関車のよう', '戦闘モード', '逃走モード', '頭が真っ白になる', 'カッとなる', '息が浅い', '視界が狭い', '暴走列車に乗っているよう', '破裂しそう', '頭が真っ白', '暴走列車', 'オーバーヒート'] },
        { score: 85,  title: 'ハイと大丈夫のあいだ', words: ['エンジンが速く回っている', '浮き足立つ', '爆発寸前', '張り詰めている', 'ギリギリで回している', 'アラームが鳴り響いている', 'プッツンきそう', 'トゲトゲしている', '休むのが怖い', '常にアクセルを踏み込んでいる', '空回り', 'トゲトゲ'] },
        { score: 65,  title: '大丈夫（高め・活気）', words: ['ワクワクする', '心地よい熱量がある', 'エンジンが心地よく回っている', '没頭している', '活気に満ちている', 'ゾーンに入っている', '風に乗っている感じ', '心地よい熱量', '弾む感じ'] },
        { score: 50,  title: '大丈夫（まんなか・凪）', words: ['穏やか', 'フラット', '呼吸が自然に出入りしている', '地に足がついている感じ', '血が巡る感じ', '身体の輪郭がわかる', '「今、ここ」にいる', '地面を感じる', '凪（なぎ）', 'おだやか', 'マシ'] },
        { score: 35,  title: '大丈夫（低め・休息）', words: ['ホッとする', '心地よい重だるさ', '温かい毛布にくるまるような安心感', '満ち足りた休息', 'まどろみ', 'ゆるむ', 'お腹が動く感じ', '日向ぼっこをしているよう', '充電中', 'リラックス'] },
        { score: 15,  title: 'ローと大丈夫のあいだ', words: ['バタンキュー', '遠くから眺めている感じ', '感覚が薄れていく', '岩のよう', '電源が落ちそう', '霧がかかったよう', '膜が張った感じ', 'シャッターが下りかけている', '鉛のように重い', '遠くの景色', 'おもい'] },
        { score: 0,   title: 'すごくロー（ゾーンの外）', words: ['電源オフ', '感覚が薄い', '麻痺している', '何も感じない', '泥のよう', '自分がどこにいるかわからない', '気配を消す', '宇宙空間に浮いているよう', '深い冬眠', 'システム保護中', '自分がわからない', 'つめたい', '強制終了', '強制スリープ', '冬眠モード', '電池切れ'] }
    ];

    const inlinePaletteArea = document.getElementById('inlinePaletteArea');
    const inlinePaletteColors = document.getElementById('inlinePaletteColors');
    const inlinePaletteWords = document.getElementById('inlinePaletteWords');
    const COMMON_PALETTE_COLORS = ['🔴', '🟠', '🟡', '🟢', '🟤', '⚪️', '🔵', '🔘', '⚫️'];
    
    

    
    // ランダム抽出関数
    function getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 言葉からの逆引き用辞書を自動生成
    const WORD_TO_SCORE = {};
    PALETTE_GROUPS.forEach(group => {
        
            // ランダムに5-6個抽出
            const count = Math.floor(Math.random() * 2) + 5; // 5 or 6
            const randomWords = getRandomItems(group.words, count);
            
            randomWords.forEach(word => {

            WORD_TO_SCORE[word] = group.score;
        });
    });

    let lastSystemInsertedColor = null;
    let lastSystemInsertedWord = null;

    function addPaletteItem(text, isColor) {
        let current = dailyMemo.value.trim();
        
        let targetToReplace = isColor ? lastSystemInsertedColor : lastSystemInsertedWord;
        
        if (targetToReplace && current.includes(targetToReplace)) {
            // 前に挿入したシステムタグを置き換え
            current = current.replace(targetToReplace, text);
        } else {
            // 無ければ追記
            current = current ? `${current} ${text}` : text;
        }
        
        dailyMemo.value = current;
        
        if (isColor) {
            lastSystemInsertedColor = text;
        } else {
            lastSystemInsertedWord = text;
        }
    }

    const modalPaletteColors = document.getElementById('modalPaletteColors');
    const modalPaletteWords = document.getElementById('modalPaletteWords');
    const wordPaletteModal = document.getElementById('wordPaletteModal');
    const closeWordPaletteModal = document.getElementById('closeWordPaletteModal');
    const paletteToggleBtn = document.getElementById('paletteToggleBtn');
    const homeStateButtons = document.querySelectorAll('#homeTab .state-button');

    // モーダルを描画する関数
    function renderModalPalette(zone) {
        if (!modalPaletteColors || !modalPaletteWords) return;
        
        // 色ボタンの描画（色だけは常に全色表示）
        modalPaletteColors.innerHTML = '';
        COMMON_PALETTE_COLORS.forEach(color => {
            const btn = document.createElement('button');
            btn.textContent = color;
            btn.style.cssText = 'font-size: 1.8rem; width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; border: none; background: transparent; cursor: pointer; transition: transform 0.2s;';
            btn.onclick = (e) => { e.preventDefault(); addPaletteItem(color, true); };
            modalPaletteColors.appendChild(btn);
        });
        
        // 色を消す（✖️）ボタン
        const clearColorBtn = document.createElement('button');
        clearColorBtn.innerHTML = '✖️';
        clearColorBtn.style.cssText = 'font-size: 1.2rem; width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; border: none; background: transparent; cursor: pointer; opacity: 0.6;';
        clearColorBtn.onclick = (e) => {
            e.preventDefault();
            addPaletteItem('', true); // 選択中の色を空文字で上書き（実質消去）
        };
        modalPaletteColors.appendChild(clearColorBtn);

        // 対象となるグループ見出しを取得
        let targetScores = [];
        if (zone === 'high') targetScores = [100, 85];
        else if (zone === 'mid') targetScores = [65, 50, 35];
        else if (zone === 'low') targetScores = [15, 0];
        else targetScores = [100, 85, 65, 50, 35, 15, 0]; // 未選択の場合は全部出す

        const targetGroups = PALETTE_GROUPS.filter(g => targetScores.includes(g.score));

        // 言葉を見出しグループごとに描画
        modalPaletteWords.innerHTML = '';
        targetGroups.forEach(group => {
            // グループのコンテナ
            const groupDiv = document.createElement('div');
            groupDiv.className = 'palette-group';
            
            // 見出し用ラッパー（センタリング用）
            const headingWrapper = document.createElement('div');
            headingWrapper.className = 'palette-group-heading-wrapper';
            
            // 見出し
            const heading = document.createElement('div');
            heading.className = 'palette-group-heading';
            heading.textContent = group.title;
            
            headingWrapper.appendChild(heading);
            groupDiv.appendChild(headingWrapper);
            
            // 言葉チップのコンテナ
            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'palette-chips-container';
            
            
            // ランダムに5-6個抽出
            const count = Math.floor(Math.random() * 2) + 5; // 5 or 6
            const randomWords = getRandomItems(group.words, count);
            
            randomWords.forEach(word => {

                const btn = document.createElement('button');
                btn.textContent = word;
                btn.style.cssText = 'font-size: 0.9rem; padding: 10px 16px; border: 1px solid #EAE6DB; background: #FFF; border-radius: 24px; color: #5C5446; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.03); margin-bottom: 4px;';
                btn.onclick = (e) => { 
                    e.preventDefault(); 
                    addPaletteItem(word, false);
                    // 内部スコアの更新
                    selectedRecordType = group.score.toString();
                    
                    // モーダルを自動で閉じる（お好みで）
                    if (wordPaletteModal) {
                        wordPaletteModal.classList.remove('active');
                        document.body.classList.remove('modal-open');
                    }
                };
                chipsDiv.appendChild(btn);
            });
            
            groupDiv.appendChild(chipsDiv);
            modalPaletteWords.appendChild(groupDiv);
        });
    }

    // 選択肢から選ぶ（リボン）ボタンの挙動：モーダルを開く
    if (paletteToggleBtn && wordPaletteModal) {
        paletteToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // 現在の選択ゾーン（high, mid, low）を判別する
            // state-buttonにselected-zoneがついているか調べる
            let activeZone = null;
            homeStateButtons.forEach(btn => {
                if (btn.classList.contains('selected-zone')) {
                    activeZone = btn.getAttribute('data-type');
                }
            });
            
            // ガードレール：未選択の場合はモーダルを開かずにトーストを出す
            if (!activeZone) {
                showToast('まずは、上のボタンから今の気分に近いものを選んでみてくださいね');
                return;
            }
            
            // モーダルを描画
            renderModalPalette(activeZone);
            
            // モーダルを表示
            wordPaletteModal.classList.add('active');
            document.body.classList.add('modal-open');
        });
    }

    // モーダルを閉じる
    if (closeWordPaletteModal) {
        closeWordPaletteModal.addEventListener('click', () => {
            wordPaletteModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
    }
    if (wordPaletteModal) {
        wordPaletteModal.addEventListener('click', (e) => {
            if (e.target === wordPaletteModal) {
                wordPaletteModal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
        });
    }

    // 初期は未選択
    selectedRecordType = null; 

    // ホームタブの3択ボタンを押したときの挙動
    homeStateButtons.forEach(button => {
        button.addEventListener('click', () => {
            // ボタンスタイル更新
            homeStateButtons.forEach(btn => btn.classList.remove('selected-zone'));
            button.classList.add('selected-zone');
            
            const type = button.getAttribute('data-type');
            let valToSet = 50;
            if (type === 'high') valToSet = 100;
            if (type === 'low') valToSet = 0;
            
            // 基本のスコアをセット（パレットで言葉を選べば更に上書きされる）
            selectedRecordType = valToSet.toString();
            
            if(submitRecordBtn) submitRecordBtn.disabled = false;
        });
    });

    if (submitRecordBtn) {
        submitRecordBtn.addEventListener('click', () => {
            if (!selectedRecordType) return;
            
            try {
                let dateToSave = new Date().toISOString();
                if (recordTimeInput && recordTimeInput.value) {
                    const parsedDate = new Date(recordTimeInput.value);
                    if (!isNaN(parsedDate.getTime())) {
                        dateToSave = parsedDate.toISOString();
                    }
                }
                
                const record = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    type: selectedRecordType,
                    memo: dailyMemo.value,
                    time: dateToSave
                };
                
                let history = JSON.parse(localStorage.getItem('seAppHistory') || '[]');
                history.push(record);
                localStorage.setItem('seAppHistory', JSON.stringify(history));
                
                if (history.length === 5) {
                    setTimeout(() => {
                        if (confirm('いつも大切に使ってくださりありがとうございます。\n大切な記録を守るために、時々設定画面から『バックアップファイル』をダウンロードしておくのがおすすめです。\n\n「設定画面」を開きますか？\n（OKで設定画面へ、キャンセルで閉じます）')) {
                            const settingsModal = document.getElementById('settingsModal');
                            if (settingsModal) {
                                settingsModal.classList.add('active');
                                document.body.classList.add('modal-open');
                            }
                        }
                    }, 500);
                }
                
                // UIリセット
                dailyMemo.value = '';
                selectedRecordType = null;
                
                // 挿入記憶もリセット
                lastSystemInsertedColor = null;
                lastSystemInsertedWord = null;
                
                homeStateButtons.forEach(btn => btn.classList.remove('selected-zone'));
                submitRecordBtn.disabled = true;
                
                // 現在時刻への再セットを確実に実行
                setNowToInput(recordTimeInput);
                
                if(typeof renderReflection === 'function') renderReflection();
                if (popupToggle.checked) {
                    // typeからスコアに変換してキーを取得する
                    // または最新ロジックでは record.type は生スコア（もし7段階利用なら）の場合や 'high','mid','low'の場合がある
                    // これまでの仕様ではレコードのtypeには生スコア（数字）が入っているかチェック
                    // 実際には生スコアが使われているはずなので rawScore を使う
                    
                    const scoreStr = record.type; // '100', '85', etc.
                    const possibleMsgs = AUTO_MESSAGES_POOL[scoreStr] || AUTO_MESSAGES_POOL['50'];
                    const randomMsg = possibleMsgs[Math.floor(Math.random() * possibleMsgs.length)];
                    
                    setTimeout(() => {
                        showToast(randomMsg, true);
                    }, 300);
                }
            } catch (err) {
                console.error(err);
                alert('保存中にエラーが発生しました。日付の形式等を再確認してください。');
                setNowToInput(recordTimeInput); // エラー時も安全な時間にリセットしておく
            }
        });
    }

    // === トースト処理とお守り保存 ===
    const saveMessageBtn = document.getElementById('saveMessageBtn');

    function showToast(text, showSaveBtn = false) {
        toastText.textContent = text;
        toastMessage.classList.remove('hidden');
        
        if (saveMessageBtn) {
            if (showSaveBtn) {
                saveMessageBtn.style.display = 'block';
                saveMessageBtn.disabled = false;
                saveMessageBtn.textContent = '🔖 この言葉をリソース箱に入れる';
                saveMessageBtn.classList.add('primary-btn');
                saveMessageBtn.classList.remove('secondary-btn');
            } else {
                saveMessageBtn.style.display = 'none';
            }
        }
    }

    function hideToast() {
        toastMessage.classList.add('hidden');
    }

    if (toastClose) toastClose.addEventListener('click', hideToast);

    if (saveMessageBtn) {
        saveMessageBtn.addEventListener('click', () => {
            const currentMessage = toastText.textContent;
            
            // 重複チェック
            // ※ここでのseAppResourcesはファイル下部で定義されているので参照可能ですが、ホイスティング等のスコープの都合で
            // getitemで直接取るか、スコープ上部で定義する必要があります。ここでは一貫性のため直接取ります。
            let resources = JSON.parse(localStorage.getItem('seAppResources') || '[]');
            const isDuplicate = resources.some(r => r.text === currentMessage);
            
            if (isDuplicate) {
                saveMessageBtn.textContent = 'すでにリソース箱にあります';
                saveMessageBtn.disabled = true;
                saveMessageBtn.classList.remove('primary-btn');
                saveMessageBtn.classList.add('secondary-btn');
                return;
            }

            // 新規保存
            const newResource = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                text: currentMessage,
                photoStr: '',
                createdAt: new Date().toISOString()
            };
            
            resources.unshift(newResource);
            try {
                localStorage.setItem('seAppResources', JSON.stringify(resources));
                // グローバルな配列も更新
                if (typeof seAppResources !== 'undefined') {
                    seAppResources = resources;
                }
                saveMessageBtn.textContent = 'リソース箱に保存しました！';
                saveMessageBtn.disabled = true;
                saveMessageBtn.classList.remove('primary-btn');
                saveMessageBtn.classList.add('secondary-btn');
                if (typeof renderResources === 'function') renderResources();
                if (typeof updateTodayWord === 'function') updateTodayWord();
            } catch (err) {
                alert('保存容量がいっぱいです。不要なデータを削除してください。');
                resources.shift();
            }
        });
    }

    // === 設定モーダル ===
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        document.body.classList.add('modal-open');
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    });

    // popupToggle の自動保存（専用ボタン廃止に伴い復元）
    popupToggle.addEventListener('change', (e) => {
        localStorage.setItem('seAppToggle', e.target.checked);
    });

    // === お守り通知 UIの開閉・権限要求・ステータス表示ロジック ===
    function updatePushStatusAnchor() {
        const anchor = document.getElementById('pushStatusAnchor');
        if (!anchor) return;
        const saved = JSON.parse(localStorage.getItem('seAppPushSettings') || 'null');
        console.log('[updatePushStatusAnchor] saved:', JSON.stringify(saved));
        
        if (!saved || !saved.enabled) {
            anchor.textContent = '現在の設定：オフ';
            return;
        }

        const preset = saved.preset;
        console.log('[updatePushStatusAnchor] preset:', preset, 'type:', typeof preset);

        if (preset === 'custom') {
            const dayMap = { '0':'日', '1':'月', '2':'火', '3':'水', '4':'木', '5':'金', '6':'土' };
            const daysArr = saved.days || [];
            const daysStr = daysArr.map(d => dayMap[String(d)] || d).join('・');
            const timeStr = saved.time || '未設定';
            if (daysStr && timeStr !== '未設定') {
                anchor.textContent = `現在の設定：オン（${daysStr}曜 ${timeStr}）`;
            } else {
                anchor.textContent = '現在の設定：オン（カスタム設定中）';
            }
        } else if (preset === 'mon-8' || preset === 'wed-12' || preset === 'fri-20') {
            const presetMap = {
                'mon-8': '月曜 8:00頃',
                'wed-12': '水曜 12:00頃',
                'fri-20': '金曜 20:00頃'
            };
            anchor.textContent = `現在の設定：オン（${presetMap[preset]}）`;
        } else {
            anchor.textContent = '現在の設定：オン (未設定)';
        }
    }

    if (pushNotificationToggle) {
        // ロード時の設定を適用し、アンカーも更新
        updatePushStatusAnchor();
        // ロード時の初期状態を反映
        const savedPushSettings = JSON.parse(localStorage.getItem('seAppPushSettings') || 'null');
        if (savedPushSettings && savedPushSettings.enabled) {
            pushNotificationToggle.checked = true;
            pushNotificationDetails.style.display = 'block';
            
            // プリセットの復元
            if (savedPushSettings.preset === 'custom') {
                if (customPresetBtn) customPresetBtn.classList.add('active');
                if (customScheduleArea) customScheduleArea.style.display = 'block';
                if (savedPushSettings.days) {
                    dayBtns.forEach(btn => {
                        if (savedPushSettings.days.includes(btn.getAttribute('data-day'))) {
                            btn.classList.add('active');
                        }
                    });
                }
                if (customTimeInput) customTimeInput.value = savedPushSettings.time || '';
            } else if (savedPushSettings.preset) {
                const targetBtn = Array.from(presetBtns).find(b => b.getAttribute('data-preset') === savedPushSettings.preset);
                if (targetBtn) targetBtn.classList.add('active');
            }
            
            if (savedPushSettings.message && savedPushSettings.message.trim() !== '') {
                if (customMessageToggle) customMessageToggle.checked = true;
                if (customMessageArea) customMessageArea.style.display = 'block';
                customPushMessage.value = savedPushSettings.message;
            } else {
                if (customMessageToggle) customMessageToggle.checked = false;
                if (customMessageArea) customMessageArea.style.display = 'none';
            }
        }

        // 開閉と権限リクエスト
        pushNotificationToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                pushNotificationDetails.style.display = 'block';
                
                // 通知権限の要求
                if ('Notification' in window && navigator.serviceWorker) {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        alert('通知が許可されませんでした。お使いの端末・ブラウザの設定から通知を許可してください。');
                        e.target.checked = false;
                        pushNotificationDetails.style.display = 'none';
                    }
                } else {
                    alert('お使いのブラウザはプッシュ通知に対応していません。');
                    e.target.checked = false;
                    pushNotificationDetails.style.display = 'none';
                }
            } else {
                pushNotificationDetails.style.display = 'none';
            }
        });
    }

    // メッセージトグルの開閉
    if (customMessageToggle) {
        customMessageToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                customMessageArea.style.display = 'block';
            } else {
                customMessageArea.style.display = 'none';
            }
        });
    }

    // 今すぐテスト通知を送るロジック
    if (testPushBtn) {
        testPushBtn.addEventListener('click', async () => {
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                alert('このブラウザまたは環境ではプッシュ通知がサポートされていません。\niPhoneの場合は、Safariの共有ボタンから「ホーム画面に追加」し、ホーム画面のアイコンからアプリを開いてお試しください。');
                return;
            }
            
            let permission = Notification.permission;
            if (permission !== 'granted') {
                permission = await Notification.requestPermission();
            }
            
            if (permission !== 'granted') {
                alert('通知が許可されていません。スマホの設定アプリから、この「ホーム画面アプリ」への通知を許可してください。');
                return;
            }

            try {
                // 確実にアクティブなServiceWorkerを取得する
                const registration = await navigator.serviceWorker.getRegistration();
                if (!registration) {
                    throw new Error('Service Workerが登録されていません。');
                }

                let testMessage = 'かんかくアプリです。今、どんなことをかんじていらっしゃいますか？無理にアプリを開かなくても大丈夫です。';
                
                if (customMessageToggle && customMessageToggle.checked && customPushMessage && customPushMessage.value.trim() !== '') {
                    testMessage = customPushMessage.value;
                }
                
                showToast('数秒後にテスト通知が届きます…');
                
                // 3秒後にローカル通知を発火
                setTimeout(() => {
                    registration.showNotification('わたしのかんかく (テスト)', {
                        body: testMessage,
                        icon: 'icon-512.png',
                        badge: 'icon-512.png',
                        vibrate: [100, 50, 100],
                        data: { url: '/' }
                    });
                }, 3000);
            } catch (err) {
                console.error('テスト送信エラー:', err);
                alert('テスト送信に失敗しました。\n「ホーム画面」から開いているかご確認ください。詳細: ' + err.message);
            }
        });
    }

    // プリセットボタンの選択ロジック
    if (presetBtns) {
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                if (customPresetBtn) customPresetBtn.classList.remove('active');
                btn.classList.add('active');
                if (customScheduleArea) customScheduleArea.style.display = 'none';
            });
        });
    }

    if (customPresetBtn) {
        customPresetBtn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            customPresetBtn.classList.add('active');
            if (customScheduleArea) customScheduleArea.style.display = 'block';
        });
    }

    if (dayBtns) {
        dayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });
    }

    // URLセーフなBase64デコード
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // カスタマイズ保存（全体設定用）
    saveSettingsBtn.addEventListener('click', () => {
        const newLabels = {
            high: customHigh.value || defaultLabels.high,
            mid: customMid.value || defaultLabels.mid,
            low: customLow.value || defaultLabels.low
        };
        localStorage.setItem('seAppLabels', JSON.stringify(newLabels));
        loadLabels();
        settingsModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        showToast('ボタンの言葉を保存しました🍵');
    });

    // --- お守り通知専用の保存ロジック ---
    if (savePushNotificationBtn) {
        savePushNotificationBtn.addEventListener('click', async () => {
            console.log('=== 通知設定保存ボタン 押下 ===');

            let pushEnabled = false;
            if (pushNotificationToggle && pushNotificationToggle.checked) {
                pushEnabled = true;
            }
            console.log('[Save] pushEnabled:', pushEnabled);

            const pushSettings = {
                enabled: pushEnabled,
                preset: null,
                days: [],
                time: '',
                message: customPushMessage ? customPushMessage.value : ''
            };

            if (pushEnabled) {
                // デバッグ: 全ボタンの状態をログ出力
                const allPresetBtns = document.querySelectorAll('.preset-btn');
                allPresetBtns.forEach(b => {
                    console.log('[Save] Button:', b.id || b.getAttribute('data-preset'), 'active:', b.classList.contains('active'));
                });

                // カスタムボタンの判定を最優先
                const isCustomActive = customPresetBtn && customPresetBtn.classList.contains('active');
                console.log('[Save] customPresetBtn active:', isCustomActive);

                if (isCustomActive) {
                    pushSettings.preset = 'custom';
                    const activeDays = Array.from(document.querySelectorAll('#customScheduleArea .day-btn.active')).map(b => b.getAttribute('data-day'));
                    pushSettings.days = activeDays;
                    pushSettings.time = customTimeInput ? customTimeInput.value : '';
                    console.log('[Save] Custom - days:', activeDays, 'time:', pushSettings.time);
                    
                    if (activeDays.length === 0) {
                        alert('曜日が選択されていません。最低一つは曜日を選んでくださいね🌿');
                        return;
                    }
                    if (!pushSettings.time) {
                        alert('時間が指定されていません。通知する時間を設定してください🌿');
                        return;
                    }
                } else {
                    // プリセットボタンの検索: data-preset属性を持つボタンのうちactiveなもの
                    const activePreset = document.querySelector('.preset-btn[data-preset].active');
                    console.log('[Save] activePreset element:', activePreset, 'data-preset:', activePreset ? activePreset.getAttribute('data-preset') : 'NONE');
                    if (activePreset && activePreset.getAttribute('data-preset')) {
                        pushSettings.preset = activePreset.getAttribute('data-preset');
                    } else {
                        alert('通知を受け取るタイミングを「いつ届けましょうか？」の選択肢から選んでください🌿');
                        return;
                    }
                }

                console.log('[Save] Final pushSettings:', JSON.stringify(pushSettings));

                // Pushサブスクリプションの取得とサーバーへの送信
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    let currentPhase = 'フェーズA: Service Worker の準備段階';
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        
                        currentPhase = 'フェーズB: Push Subscription の取得段階';
                        let subscription = await registration.pushManager.getSubscription();

                        // 既存の購読が「今使うべき鍵」と異なる場合（サーバー切り替え等）は、
                        // 古い購読のまま送るとサーバー側の秘密鍵と合わず届かないため、一旦解除して取り直す。
                        if (subscription) {
                            const currentKey = new Uint8Array(subscription.options?.applicationServerKey || []);
                            const expectedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
                            const sameKey = currentKey.length === expectedKey.length &&
                                currentKey.every((byte, i) => byte === expectedKey[i]);
                            if (!sameKey) {
                                console.log('[Save] VAPID鍵が変更されたため、古い購読を解除して再取得します。');
                                await subscription.unsubscribe();
                                subscription = null;
                            }
                        }

                        if (!subscription) {
                            try {
                                const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
                                subscription = await registration.pushManager.subscribe({
                                    userVisibleOnly: true,
                                    applicationServerKey: applicationServerKey
                                });
                            } catch(subErr) {
                                console.warn('サブスクリプション登録に失敗しました。', subErr);
                                throw new Error('サブスクリプションの登録に失敗しました (' + subErr.message + ')');
                            }
                        }

                        if (!subscription || !WORKER_URL) {
                            throw new Error('Pushサブスクリプションの取得、またはサーバーURLの設定に問題があります。');
                        }

                        currentPhase = 'フェーズC: Worker への fetch 送信段階 (ネットワーク等)';
                        console.log('--- 通知登録リクエスト送信 ---');
                        console.log('エンドポイント:', subscription.endpoint);
                        console.log('送信する設定 (pushSettings):', pushSettings);
                        
                        let res;
                        try {
                            res = await fetch(WORKER_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subscription: subscription,
                                    settings: pushSettings
                                })
                            });
                        } catch (fetchErr) {
                            throw new Error(`通信エラーによってWorkerへ到達できませんでした: ${fetchErr.message}`);
                        }
                        
                        currentPhase = 'フェーズD: Worker からのレスポンス結果検証';
                        if (!res.ok) {
                            let serverMessage = '';
                            try {
                                const errJson = await res.json();
                                serverMessage = errJson.error || JSON.stringify(errJson);
                            } catch(parseErr) {
                                serverMessage = await res.text();
                            }
                            throw new Error(`サーバーレスポンスエラー (ステータス: ${res.status})\n理由: ${serverMessage}`);
                        }
                    } catch(e) {
                        console.error(`Push Service Error [${currentPhase}]:`, e);
                        alert(`保存エラー [${currentPhase}]\n\n【エラー詳細】\n${e.message}`);
                        
                        // エラー時もボタンの見た目を戻す（念のため）
                        savePushNotificationBtn.textContent = '通知設定を保存';
                        savePushNotificationBtn.style.backgroundColor = 'var(--accent)';
                        return; // エラー時はここで終了し、保存処理を中断する
                    }
                }
            }
            
            // 全て成功した場合のみ保存
            localStorage.setItem('seAppPushSettings', JSON.stringify(pushSettings));
            updatePushStatusAnchor();

            // UIフィードバック（ボタン一時変更）
            const originalBtnText = savePushNotificationBtn.textContent;
            savePushNotificationBtn.textContent = '保存しました ✔';
            savePushNotificationBtn.style.backgroundColor = '#4caf50';
            
            setTimeout(() => {
                savePushNotificationBtn.textContent = originalBtnText;
                savePushNotificationBtn.style.backgroundColor = 'var(--accent)';
                settingsModal.classList.remove('active');
                document.body.classList.remove('modal-open');
                showToast('通知の設定を保存しました🌿');
            }, 800);
        });
    }

    // カスタマイズ初期化
    resetSettingsBtn.addEventListener('click', () => {
        localStorage.removeItem('seAppLabels');
        loadLabels();
        settingsModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        showToast('ボタンの言葉を初期設定に戻しました🍵');
    });

    // === 振り返り関連（グラフとカレンダー） ===
    let chartInstance = null;
    let currentCalDate = new Date();

    function renderReflection() {
        let history = JSON.parse(localStorage.getItem('seAppHistory') || '[]');
        
        // 時系列順にソート（過去から現在へ）
        history.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        const dailyData = {};
        
        history.forEach(r => {
            const d = new Date(r.time);
            const offset = d.getTimezoneOffset() * 60000;
            const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = [];
            }
            dailyData[dateStr].push(r);
        });
        // --- グラフ：時間軸に沿った日内変動を描画 ---
        const recentHistory = history.slice(-50); // 最新50件を表示
        
        // X軸をスッキリさせる：日付が切り替わった最初のみ文字を出し、それ以外は隠す
        let lastDateString = "";
        const chartLabels = recentHistory.map(r => {
            const d = new Date(r.time);
            const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
            if (dateStr !== lastDateString) {
                lastDateString = dateStr;
                return dateStr;
            }
            return ''; // 省略
        });
        
        // データポイント：直接数値を保持するようにする（過去データは100,50,0へ）
        const chartDataPoints = recentHistory.map(r => {
            if (!isNaN(parseInt(r.type))) return parseInt(r.type);
            if (r.type === 'high') return 100;
            if (r.type === 'mid') return 50;
            return 0; // low
        });
        
        const canvas = document.getElementById('waveChart');
        if(!canvas) return; 
        const ctx = canvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: '状態',
                    data: chartDataPoints,
                    borderColor: '#A9BCA3',
                    backgroundColor: 'rgba(169, 188, 163, 0.2)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: '#A9BCA3',
                    pointRadius: 4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: -10,
                        max: 110,
                        ticks: {
                            stepSize: 50,
                            callback: function(value) {
                                if (value === 100) return '🔥';
                                if (value === 50) return '☕️';
                                if (value === 0) return '❄️';
                                return '';
                            },
                            font: { size: 14 }
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // ツールチップのタイトルには正確な時間を表示
                                const idx = context[0].dataIndex;
                                const originalRecord = recentHistory[idx];
                                const d = new Date(originalRecord.time);
                                return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        });
        
        renderCalendar(dailyData);
    }
    
    // --- カレンダー描画（ドット対応） ---
    function renderCalendar(dailyData) {
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        
        const currentMonthLabel = document.getElementById('currentMonthLabel');
        if(currentMonthLabel) currentMonthLabel.textContent = `${year}年${month + 1}月`;
        
        const grid = document.getElementById('calendarGrid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const todayDate = new Date();
        const offsetToday = todayDate.getTimezoneOffset() * 60000;
        const todayStr = new Date(todayDate.getTime() - offsetToday).toISOString().split('T')[0];
        
        // default labels, fallback if nothing saved
        const defaultLabels = {
            high: 'ハイ（たかぶり・ざわざわ）',
            mid: '大丈夫（ほどほど・リラックス）',
            low: 'ロー（おもい・とおい）'
        };
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            grid.appendChild(emptyCell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const cellDateSpan = document.createElement('span');
            cellDateSpan.className = 'cell-date';
            cellDateSpan.textContent = day;
            cell.appendChild(cellDateSpan);
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (dateStr === todayStr) {
                cell.classList.add('cal-today');
            }
            
            if (dailyData[dateStr] && dailyData[dateStr].length > 0) {
                const records = dailyData[dateStr];
                
                // ドット描画
                const dotContainer = document.createElement('div');
                dotContainer.className = 'calendar-dots';
                
                const MAX_DOTS = 5;
                records.slice(0, MAX_DOTS).forEach(record => {
                    const dot = document.createElement('span');
                    const zone = getZone(record.type);
                    dot.className = `cal-dot dot-${zone}`;
                    dotContainer.appendChild(dot);
                });
                
                if (records.length > MAX_DOTS) {
                    const plusDot = document.createElement('span');
                    plusDot.className = 'cal-dot-plus';
                    plusDot.textContent = '+';
                    dotContainer.appendChild(plusDot);
                }
                
                cell.appendChild(dotContainer);
                
                // タップ時のタイムライン表示
                cell.addEventListener('click', () => {
                    const savedLabels = JSON.parse(localStorage.getItem('seAppLabels') || 'null') || defaultLabels;
                    const emojiMap = { 'high': '🔥', 'mid': '☕️', 'low': '❄️' };
                    
                    document.getElementById('memoDisplay').classList.remove('hidden');
                    document.getElementById('memoDateLabel').textContent = `${month+1}月${day}日の記録`;
                    
                    const container = document.getElementById('memoListContainer');
                    if(container) {
                        container.innerHTML = '';
                        
                        records.forEach(record => {
                            const d = new Date(record.time);
                            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            
                            const item = document.createElement('div');
                            item.className = 'timeline-item';
                            
                            const zone = getZone(record.type);
                            const zoneLabel = `${emojiMap[zone]} ${savedLabels[zone]}`;
                            // 細かい数値情報を表示したい場合はここに追加可能
                            const detailValue = !isNaN(parseInt(record.type)) ? ` <span style="font-size: 0.75rem; color:#8E8578; margin-left:8px;">[${record.type}]</span>` : '';
                            
                            item.innerHTML = `
                                <div class="timeline-time">${timeStr}</div>
                                <div class="timeline-content">
                                    <div class="timeline-zone">${zoneLabel}${detailValue}</div>
                                    ${record.memo ? `<div class="timeline-memo">${record.memo}</div>` : ''}
                                    <div class="timeline-actions">
                                        <button class="action-link edit-link">編集</button>
                                        <button class="action-link delete-link">削除</button>
                                    </div>
                                </div>
                            `;
                            container.appendChild(item);
                            
                            const editBtn = item.querySelector('.edit-link');
                            const deleteBtn = item.querySelector('.delete-link');
                            
                            deleteBtn.addEventListener('click', () => {
                                if (confirm('この記録を消してもよろしいですか？')) {
                                    let history = JSON.parse(localStorage.getItem('seAppHistory') || '[]');
                                    history = history.filter(r => (r.id || r.time) !== (record.id || record.time));
                                    localStorage.setItem('seAppHistory', JSON.stringify(history));
                                    renderReflection();
                                    document.getElementById('memoListContainer').innerHTML = '';
                                    document.getElementById('memoDisplay').classList.add('hidden');
                                }
                            });
                            
                            editBtn.addEventListener('click', () => {
                                editRecordId.value = record.id || record.time;
                                editRecordMemo.value = record.memo || '';
                                
                                const d = new Date(record.time);
                                const offsetD = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                                editRecordTime.value = offsetD.toISOString().slice(0, 16);
                                
                                editSelectedType = record.type;
                                editZoneBtns.forEach(b => {
                                    if (b.getAttribute('data-type') === record.type) b.classList.add('selected-zone');
                                    else b.classList.remove('selected-zone');
                                });
                                
                                editRecordModal.classList.add('active');
                                document.body.classList.add('modal-open');
                            });
                        });
                    }
                });
            }
            grid.appendChild(cell);
        }
    }
    
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if(prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalDate.setMonth(currentCalDate.getMonth() - 1);
            renderReflection();
        });
    }
    if(nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentCalDate.setMonth(currentCalDate.getMonth() + 1);
            renderReflection();
        });
    }

    setTimeout(() => {
        renderReflection();
    }, 100);

    // === 編集モーダル関連ロジック ===
    if (editZoneBtns) {
        editZoneBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                editZoneBtns.forEach(b => b.classList.remove('selected-zone'));
                btn.classList.add('selected-zone');
                editSelectedType = btn.getAttribute('data-type');
            });
        });
    }

    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            editRecordModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            if(!editRecordTime.value || !editSelectedType) return;
            
            const identifier = editRecordId.value;
            let history = JSON.parse(localStorage.getItem('seAppHistory') || '[]');
            const index = history.findIndex(r => (r.id || r.time) === identifier);
            
            if (index !== -1) {
                history[index].time = new Date(editRecordTime.value).toISOString();
                history[index].type = editSelectedType;
                history[index].memo = editRecordMemo.value;
                localStorage.setItem('seAppHistory', JSON.stringify(history));
                
                renderReflection();
                document.getElementById('memoListContainer').innerHTML = '';
                document.getElementById('memoDisplay').classList.add('hidden');
            }
            editRecordModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
    }

    // === リソース（ギャラリー）関連 ===
    const resourceGallery = document.getElementById('resourceGallery');
    const addResourceFab = document.getElementById('addResourceFab');
    const addResourceModal = document.getElementById('addResourceModal');
    const closeAddResourceModal = document.getElementById('closeAddResourceModal');
    const saveResourceBtn = document.getElementById('saveResourceBtn');
    // loadingOverlayは上部で取得済み

    // モーダル開閉
    if (addResourceFab) {
        addResourceFab.addEventListener('click', () => {
            // リセット
            resourceNote.value = '';
            photoPreview.style.display = 'none';
            if (photoPlaceholder) {
                photoPlaceholder.innerHTML = '<span>写真をえらぶ</span>';
                photoPlaceholder.style.display = 'flex';
            }
            if (photoArea) {
                photoArea.style.border = '2px dashed #D6D2CA';
            }
            if (photoInput) {
                photoInput.value = '';
            }
            
            addResourceModal.classList.add('active');
            document.body.classList.add('modal-open');
        });
    }

    if (closeAddResourceModal) {
        closeAddResourceModal.addEventListener('click', () => {
            addResourceModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        });
    }

    // 写真選択
    if (photoArea) {
        photoArea.addEventListener('click', () => {
            photoInput.click();
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 5) {
                alert('申し訳ありません。システムの都合上、一度に保存できるのは5枚までとなっています。\n\n大切な記録を確実に残すため、数回に分けて保存していただけると幸いです。');
                e.target.value = '';
                photoPreview.style.display = 'none';
                photoPlaceholder.innerHTML = '<span>写真をえらぶ</span>';
                photoPlaceholder.style.display = 'flex';
                photoArea.style.border = '2px dashed #D6D2CA';
                return;
            }
            if (files.length === 0) {
                photoPreview.style.display = 'none';
                photoPlaceholder.innerHTML = '<span>写真をえらぶ</span>';
                photoPlaceholder.style.display = 'flex';
                photoArea.style.border = '2px dashed #D6D2CA';
            } else {
                photoPreview.style.display = 'none';
                photoPlaceholder.innerHTML = `<span style="color:var(--accent);font-weight:bold;">${files.length}枚の写真を選択中</span>`;
                photoPlaceholder.style.display = 'flex';
                photoArea.style.border = '2px solid var(--accent)';
            }
        });
    }

    // Canvas圧縮のPromiseラッパー
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 600; // 画像圧縮上限を600pxへ再調整
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // JPEG圧縮率0.7へ再調整
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 新規保存
    if (saveResourceBtn) {
        saveResourceBtn.addEventListener('click', async () => {
            const text = resourceNote ? resourceNote.value.trim() : '';
            const files = photoInput && photoInput.files ? Array.from(photoInput.files) : [];

            if (!text && files.length === 0) {
                alert('言葉を入力するか、写真を選んでください');
                return;
            }

            let filesToProcess = files;

            if (loadingOverlay) loadingOverlay.classList.add('active');

            let newResources = [];
            const timestamp = new Date().toISOString();

            try {
                if (filesToProcess.length > 0) {
                    for (let i = 0; i < filesToProcess.length; i++) {
                        if (loadingOverlay) loadingOverlay.querySelector('p').textContent = `大切に保存しています（${i+1}/${filesToProcess.length}枚）...`;
                        const base64 = await compressImage(filesToProcess[i]);
                        newResources.push({
                            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + i,
                            text: (i === 0) ? text : '', // テキストは1枚目に集約
                            photoStr: base64,
                            createdAt: timestamp
                        });
                    }
                } else if (text) {
                    newResources.push({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                        text: text,
                        photoStr: '',
                        createdAt: timestamp
                    });
                }

                seAppResources.unshift(...newResources);
                localStorage.setItem('seAppResources', JSON.stringify(seAppResources));
                
                addResourceModal.classList.remove('active');
                document.body.classList.remove('modal-open');
                renderResources();
                updateTodayWord();
                showToast('リソース箱に保存しました🎁');
                
            } catch (err) {
                console.error('保存処理エラー', err);
                alert('保存に失敗しました。画像のサイズが大きいか、容量がいっぱいの可能性があります。');
                if (newResources.length > 0) {
                    seAppResources.splice(0, newResources.length);
                }
            } finally {
                if (loadingOverlay) loadingOverlay.classList.remove('active');
            }
        });
    }

    // 内部タブ切り替え処理
    const innerTabBtns = document.querySelectorAll('.inner-tab-btn');
    const innerTabContents = document.querySelectorAll('.inner-tab-content');
    
    innerTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            innerTabBtns.forEach(b => b.classList.remove('active'));
            innerTabContents.forEach(c => {
                c.classList.remove('active');
            });
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-in-target');
            const targetContent = document.getElementById(targetId);
            if(targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // 今日のリソースをセットする
    function updateTodayWord() {
        const todayResourceContent = document.getElementById('todayResourceContent');
        if (!todayResourceContent) return;
        
        // 写真＋言葉の「言葉（キャプション）」が混じらないよう、画像がある場合は画像のみ、ない場合は純粋な言葉のみを表示
        if (seAppResources.length > 0) {
            const randomRes = seAppResources[Math.floor(Math.random() * seAppResources.length)];
            let html = '';
            if (randomRes.photoStr) {
                html += `<img src="${randomRes.photoStr}">`;
            } else if (randomRes.text && randomRes.text.trim() !== '') {
                html += `<p style="font-size: 1.1rem; text-align: center;">${randomRes.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
            }
            todayResourceContent.innerHTML = html;
        } else {
            todayResourceContent.innerHTML = '<p id="todayWordText">右下の＋ボタンから、あなたのホッとする言葉や写真を追加してみましょう</p>';
        }
    }

    // タップで引き直し
    const todayWordArea = document.getElementById('todayWordArea');
    if (todayWordArea) {
        todayWordArea.addEventListener('click', updateTodayWord);
    }

    // リソース箱タブが開かれた時に「今日の言葉」を更新するイベントを追加
    // （既存のnavItemsループ内で呼ばれるようにもできますが、手軽にここにも追加）
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.getAttribute('data-target') === 'resourceTab') {
                updateTodayWord();
            }
        });
    });

    let globalPhotoResources = [];
    let currentPhotoIndex = -1;

    function updatePhotoView() {
        if (currentPhotoIndex < 0 || currentPhotoIndex >= globalPhotoResources.length) return;
        const res = globalPhotoResources[currentPhotoIndex];
        const photoViewImg = document.getElementById('photoViewImg');
        const photoViewText = document.getElementById('photoViewText');
        const photoViewResourceId = document.getElementById('photoViewResourceId');
        const prevPhotoBtn = document.getElementById('prevPhotoBtn');
        const nextPhotoBtn = document.getElementById('nextPhotoBtn');
        
        if (photoViewImg) photoViewImg.src = res.photoStr;
        if (photoViewText) photoViewText.textContent = res.text || '';
        if (photoViewResourceId) photoViewResourceId.value = res.id;
        
        if (prevPhotoBtn) prevPhotoBtn.style.display = currentPhotoIndex > 0 ? 'flex' : 'none';
        if (nextPhotoBtn) nextPhotoBtn.style.display = currentPhotoIndex < globalPhotoResources.length - 1 ? 'flex' : 'none';
    }

    const prevPhotoBtn = document.getElementById('prevPhotoBtn');
    if (prevPhotoBtn) {
        prevPhotoBtn.addEventListener('click', () => {
            if (currentPhotoIndex > 0) { currentPhotoIndex--; updatePhotoView(); }
        });
    }
    const nextPhotoBtn = document.getElementById('nextPhotoBtn');
    if (nextPhotoBtn) {
        nextPhotoBtn.addEventListener('click', () => {
            if (currentPhotoIndex < globalPhotoResources.length - 1) { currentPhotoIndex++; updatePhotoView(); }
        });
    }

    // ギャラリー描画
    function renderResources() {
        const photoGalleryTab = document.getElementById('photoGalleryTab');
        const wordGalleryTab = document.getElementById('wordGalleryTab');
        
        const photoViewModal = document.getElementById('photoViewModal');
        const closePhotoViewModal = document.getElementById('closePhotoViewModal');
        const photoViewImg = document.getElementById('photoViewImg');
        const photoViewText = document.getElementById('photoViewText');
        const deletePhotoBtn = document.getElementById('deletePhotoBtn');
        const photoViewResourceId = document.getElementById('photoViewResourceId');
        
        if (photoGalleryTab) photoGalleryTab.innerHTML = '';
        if (wordGalleryTab) wordGalleryTab.innerHTML = '';
        
        globalPhotoResources = seAppResources.filter(r => r.photoStr);
        
        seAppResources.forEach(res => {
            // 写真ギャラリー（グリッド表示）
            if (res.photoStr && photoGalleryTab) {
                const item = document.createElement('div');
                item.className = 'photo-grid-item';
                item.innerHTML = `<img src="${res.photoStr}" alt="写真">`;
                
                item.addEventListener('click', () => {
                    currentPhotoIndex = globalPhotoResources.findIndex(r => r.id === res.id);
                    updatePhotoView();
                    if (photoViewModal) {
                        photoViewModal.classList.add('active');
                        document.body.classList.add('modal-open');
                    }
                });
                
                photoGalleryTab.appendChild(item);
            }
            
            // 言葉タブ（リスト表示）: 画像データがない純粋なテキストのみに厳格化
            if (!res.photoStr && res.text && res.text.trim() !== '' && wordGalleryTab) {
                const card = document.createElement('div');
                card.className = 'resource-card';
                card.innerHTML = `
                    <p style="font-size: 1rem;">${res.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                    <div style="text-align: right;">
                        <button class="delete-resource-btn" data-id="${res.id}">削除</button>
                    </div>
                `;
                wordGalleryTab.appendChild(card);
            }
        });

        // 言葉ギャラリーの削除イベント
        const textDeleteBtns = wordGalleryTab ? wordGalleryTab.querySelectorAll('.delete-resource-btn') : [];
        textDeleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.delete-resource-btn');
                if (confirm('このリソースを削除しますか？')) {
                    const idToDelete = targetBtn.getAttribute('data-id');
                    seAppResources = seAppResources.filter(r => r.id !== idToDelete);
                    localStorage.setItem('seAppResources', JSON.stringify(seAppResources));
                    renderResources();
                    updateTodayWord();
                }
            });
        });
        
        // 写真モーダル系のイベントをバインド（一度だけ）
        if (closePhotoViewModal && !closePhotoViewModal.dataset.bound) {
            closePhotoViewModal.dataset.bound = 'true';
            closePhotoViewModal.addEventListener('click', () => {
                if (photoViewModal) {
                    photoViewModal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });
            
            if (deletePhotoBtn) {
                deletePhotoBtn.addEventListener('click', () => {
                    const targetId = photoViewResourceId.value;
                    if (confirm('この写真を削除してもよろしいですか？')) {
                        seAppResources = seAppResources.filter(r => r.id !== targetId);
                        localStorage.setItem('seAppResources', JSON.stringify(seAppResources));
                        if (photoViewModal) {
                            photoViewModal.classList.remove('active');
                            document.body.classList.remove('modal-open');
                        }
                        renderResources();
                        updateTodayWord();
                    }
                });
            }
        }
    }

    // === データバックアップと復元 ===
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            try {
                // メモリ負荷を最小限に抑えるため、単一の巨大な文字列ではなく配列としてBlobに渡す
                const settingsStr = localStorage.getItem('seAppSettings') || '{}';
                const historyStr = localStorage.getItem('seAppHistory') || '[]';
                const resourcesStr = localStorage.getItem('seAppResources') || '[]';
                
                const blob = new Blob([
                    '{"seAppSettings":', JSON.stringify(settingsStr),
                    ',"seAppHistory":', JSON.stringify(historyStr),
                    ',"seAppResources":', JSON.stringify(resourcesStr), '}'
                ], { type: 'application/json' });
                
                const url = URL.createObjectURL(blob);
                
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const filename = `kankaku_backup_${yyyy}${mm}${dd}.json`;
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error(e);
                alert('書き出しに失敗しました。');
            }
        });
    }

    if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => {
            const file = importFileInput.files[0];
            if (!file) {
                alert('復元するバックアップファイルを選択してください。');
                return;
            }
            if (confirm('現在のデータ（あれば）は上書きされ、一度すべて消去してから復元します。よろしいですか？')) {
                if (loadingOverlay) {
                    loadingOverlay.classList.add('active');
                    const p = loadingOverlay.querySelector('p');
                    if (p) p.innerHTML = 'ただいま記憶を復元しています...<br>完了までこのままお待ちください。';
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    setTimeout(() => {
                        try {
                            const parsedData = JSON.parse(e.target.result);
                            if (parsedData.seAppHistory || parsedData.seAppResources) {
                                // 空き容量の枯渇（残骸との衝突）を防ぐために一度確実にクリアする
                                localStorage.removeItem('seAppSettings');
                                localStorage.removeItem('seAppHistory');
                                localStorage.removeItem('seAppResources');
                                
                                localStorage.setItem('seAppSettings', parsedData.seAppSettings || '{}');
                                localStorage.setItem('seAppHistory', parsedData.seAppHistory || '[]');
                                localStorage.setItem('seAppResources', parsedData.seAppResources || '[]');
                                
                                alert('復元が完了しました。アプリを再読み込みします。');
                                window.location.reload();
                            } else {
                                if (loadingOverlay) loadingOverlay.classList.remove('active');
                                alert('データ形式が正しくありません。正しいJSONファイルを選択してください。');
                            }
                        } catch (err) {
                            console.error(err);
                            if (loadingOverlay) loadingOverlay.classList.remove('active');
                            alert('データの復元に失敗しました。ファイルが破損しているか、容量が大きすぎる可能性があります。');
                        }
                    }, 500); // UIスレッドのブロックを緩和
                };
                reader.onerror = () => {
                    if (loadingOverlay) loadingOverlay.classList.remove('active');
                    alert('ファイルの読み込みに失敗しました。');
                };
                reader.readAsText(file);
            }
        });
    }

    // 全モーダル共通：背景タップで閉じる処理
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
        });
    });

    // === 感覚パレットロジック ===
    const openPaletteBtn = document.getElementById('openPaletteBtn');
    const paletteModal = document.getElementById('paletteModal');
    const closePaletteModal = document.getElementById('closePaletteModal');
    const paletteColors = document.getElementById('paletteColors');
    const paletteWords = document.getElementById('paletteWords');
    const settingsPaletteBtns = document.querySelectorAll('.settings-palette-btn');

    let currentPaletteTargetInput = null;
    const PALETTE_COLORS = ['🔴', '🟠', '🟡', '🟢', '🟤', '⚪️', '🔵', '🔘', '⚫️'];

    function openPalette(zone, targetInputId, showColors) {
        currentPaletteTargetInput = targetInputId;

        // Render colors
        paletteColors.innerHTML = '';
        if (showColors) {
            if (paletteColors.previousElementSibling) paletteColors.previousElementSibling.style.display = 'block';
            paletteColors.style.display = 'flex';
            PALETTE_COLORS.forEach(color => {
                const btn = document.createElement('button');
                btn.textContent = color;
                btn.style.cssText = 'font-size: 1.5rem; padding: 6px; border: none; background: transparent; cursor: pointer; transition: transform 0.2s;';
                btn.onclick = () => addToInput(color);
                paletteColors.appendChild(btn);
            });
        } else {
            if (paletteColors.previousElementSibling) paletteColors.previousElementSibling.style.display = 'none';
            paletteColors.style.display = 'none';
        }

        // Render words（ゾーンごとに折りたたみ表示。一度に全語彙を見せず、必要な分だけそっと開けるようにする）
        paletteWords.innerHTML = '';
        let targetScores = [];
        if (zone === 'high') targetScores = [100, 85];
        else if (zone === 'mid') targetScores = [65, 50, 35];
        else if (zone === 'low') targetScores = [15, 0];

        const targetGroups = PALETTE_GROUPS.filter(g => targetScores.includes(g.score));

        targetGroups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'palette-accordion-group';

            const heading = document.createElement('button');
            heading.type = 'button';
            heading.className = 'palette-accordion-heading';
            heading.innerHTML = `<span>${group.title}</span><span class="palette-accordion-arrow">▾</span>`;
            heading.addEventListener('click', () => {
                const isOpen = groupDiv.classList.toggle('is-open');
                heading.querySelector('.palette-accordion-arrow').textContent = isOpen ? '▴' : '▾';
            });

            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'palette-accordion-body';
            group.words.forEach(word => {
                const btn = document.createElement('button');
                btn.textContent = word;
                btn.style.cssText = 'font-size: 0.85rem; padding: 6px 12px; border: 1px solid #D6D2CA; background: #FFF; border-radius: 20px; color: #5C5446; cursor: pointer; margin-bottom:4px;';
                btn.onclick = () => addToInput(word);
                chipsDiv.appendChild(btn);
            });

            groupDiv.appendChild(heading);
            groupDiv.appendChild(chipsDiv);
            paletteWords.appendChild(groupDiv);
        });

        if (paletteModal) {
            paletteModal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    if (openPaletteBtn) {
        openPaletteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedRecordType) {
                alert('先に「🔥」「☕️」「❄️」のいずれかのボタンを選んでください。');
                return;
            }
            openPalette(selectedRecordType, 'dailyMemo', true);
        });
    }

    settingsPaletteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const zone = btn.getAttribute('data-zone');
            const targetInputId = btn.getAttribute('data-target-input');
            openPalette(zone, targetInputId, true);
        });
    });

    if (closePaletteModal) {
        closePaletteModal.addEventListener('click', () => {
            if (paletteModal) paletteModal.classList.remove('active');
            const settingsModal = document.getElementById('settingsModal');
            if (!settingsModal || !settingsModal.classList.contains('active')) {
                document.body.classList.remove('modal-open');
            }
        });
    }

    function addToInput(text) {
        const inputField = document.getElementById(currentPaletteTargetInput);
        if (inputField) {
            if (currentPaletteTargetInput === 'dailyMemo') {
                const current = inputField.value.trim();
                inputField.value = current ? `${current} ${text}` : text;
            } else {
                inputField.value = text;
            }
        }
        
        if (paletteModal) {
            paletteModal.classList.remove('active');
            const settingsModal = document.getElementById('settingsModal');
            if (!settingsModal || !settingsModal.classList.contains('active')) {
                document.body.classList.remove('modal-open');
            }
        }
    }

    if (paletteModal) {
        paletteModal.addEventListener('click', (e) => {
            if (e.target === paletteModal) {
                paletteModal.classList.remove('active');
                const settingsModal = document.getElementById('settingsModal');
                if (!settingsModal || !settingsModal.classList.contains('active')) {
                    document.body.classList.remove('modal-open');
                }
            }
        });
    }

    // === 初回チュートリアル ===
    const tutorialModal = document.getElementById('tutorialModal');
    const tutorialSlides = tutorialModal ? tutorialModal.querySelectorAll('.tutorial-slide') : [];
    const tutorialDots = tutorialModal ? tutorialModal.querySelectorAll('.tutorial-dot') : [];
    const tutorialBackBtn = document.getElementById('tutorialBackBtn');
    const tutorialNextBtn = document.getElementById('tutorialNextBtn');
    const tutorialGoToNotificationBtn = document.getElementById('tutorialGoToNotificationBtn');
    const tutorialFinishBtn = document.getElementById('tutorialFinishBtn');
    const closeTutorial = document.getElementById('closeTutorial');
    const reopenTutorialBtn = document.getElementById('reopenTutorialBtn');
    const tutorialSlide4Text = document.getElementById('tutorialSlide4Text');
    const tutorialTryBackupBtn = document.getElementById('tutorialTryBackupBtn');
    const tutorialResumeNote = document.getElementById('tutorialResumeNote');

    const TUTORIAL_TOTAL_SLIDES = 6;
    const TUTORIAL_RESUME_KEY = 'seAppTutorialResumeSlide';
    let tutorialCurrentSlide = 1;

    function isIOSDevice() {
        return /iPhone|iPad|iPod/.test(navigator.userAgent);
    }

    function isStandaloneMode() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function renderTutorialSlide4() {
        const stepsEl = document.getElementById('tutorialSteps');
        const isIOS = isIOSDevice();
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        if (!isMobile) {
            tutorialSlide4Text.innerHTML = 'このアプリは、いつでも取り出しやすいスマートフォンでご利用いただくことを想定して作っています。<br><br>もしよろしければ、お手持ちのスマートフォンでこのページを開いていただくのがおすすめです。';
            if (stepsEl) stepsEl.style.display = 'none';
            return false;
        }

        if (isStandaloneMode()) {
            tutorialSlide4Text.innerHTML = 'ホーム画面に追加済みですね。ありがとうございます。<br><br>このまま続きをご案内します。';
            if (stepsEl) stepsEl.style.display = 'none';
            return false;
        }

        tutorialSlide4Text.innerHTML = 'ホーム画面に追加すると、いつもお使いのアプリのように開け、記録や通知もより安定してご利用いただけます。';
        if (stepsEl) {
            stepsEl.style.display = 'flex';
            const label1 = document.getElementById('tutorialStepLabel1');
            const label2 = document.getElementById('tutorialStepLabel2');
            const label3 = document.getElementById('tutorialStepLabel3');
            if (isIOS) {
                if (label1) label1.textContent = '共有ボタン（見当たらなければ「•••」）をタップ';
                if (label2) label2.textContent = '「ホーム画面に追加」を選ぶ';
                if (label3) label3.textContent = '「追加」をタップ';
            } else {
                if (label1) label1.textContent = 'メニュー（︙）をタップ';
                if (label2) label2.textContent = '「ホーム画面に追加」を選ぶ';
                if (label3) label3.textContent = '「追加」をタップ';
            }
        }
        // ホーム画面未追加のユーザーには、追加後アイコンから開いた時に続きから再開できるよう目印を残す
        localStorage.setItem(TUTORIAL_RESUME_KEY, '5');
        return true;
    }

    function renderTutorialSlide() {
        tutorialSlides.forEach(slide => {
            const isActive = Number(slide.dataset.slide) === tutorialCurrentSlide;
            if (isActive) {
                slide.classList.add('active');
                requestAnimationFrame(() => slide.classList.add('tutorial-fade-in'));
            } else {
                slide.classList.remove('active', 'tutorial-fade-in');
            }
        });
        tutorialDots.forEach(dot => {
            dot.classList.toggle('active', Number(dot.dataset.dot) === tutorialCurrentSlide);
        });

        if (tutorialBackBtn) tutorialBackBtn.classList.toggle('tutorial-nav-hidden', tutorialCurrentSlide === 1);
        const isLastSlide = tutorialCurrentSlide === TUTORIAL_TOTAL_SLIDES;
        if (tutorialNextBtn) tutorialNextBtn.classList.toggle('tutorial-nav-hidden', isLastSlide);

        if (tutorialCurrentSlide === 4 && tutorialSlide4Text) {
            const encourageAdd = renderTutorialSlide4();
            if (tutorialNextBtn) tutorialNextBtn.classList.toggle('tutorial-next-subtle', encourageAdd);
        } else if (tutorialNextBtn) {
            tutorialNextBtn.classList.remove('tutorial-next-subtle');
        }
    }

    function openTutorial(startSlide, resumed) {
        if (!tutorialModal) return;
        tutorialCurrentSlide = startSlide || 1;
        renderTutorialSlide();
        if (tutorialResumeNote) tutorialResumeNote.style.display = resumed ? 'block' : 'none';
        tutorialModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    function closeTutorialModal() {
        if (!tutorialModal) return;
        tutorialModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        localStorage.setItem('seAppTutorialSeen', 'true');
    }

    if (tutorialNextBtn) {
        tutorialNextBtn.addEventListener('click', () => {
            if (tutorialCurrentSlide < TUTORIAL_TOTAL_SLIDES) {
                tutorialCurrentSlide++;
                renderTutorialSlide();
            }
        });
    }

    if (tutorialBackBtn) {
        tutorialBackBtn.addEventListener('click', () => {
            if (tutorialCurrentSlide > 1) {
                tutorialCurrentSlide--;
                renderTutorialSlide();
            }
        });
    }

    if (closeTutorial) {
        closeTutorial.addEventListener('click', closeTutorialModal);
    }

    if (tutorialFinishBtn) {
        tutorialFinishBtn.addEventListener('click', closeTutorialModal);
    }

    if (tutorialModal) {
        tutorialModal.addEventListener('click', (e) => {
            if (e.target === tutorialModal) closeTutorialModal();
        });
    }

    if (tutorialGoToNotificationBtn) {
        tutorialGoToNotificationBtn.addEventListener('click', () => {
            closeTutorialModal();
            if (settingsModal) {
                settingsModal.classList.add('active');
                document.body.classList.add('modal-open');
                setTimeout(() => {
                    const pushCard = document.getElementById('pushNotificationCard');
                    if (pushCard) pushCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        });
    }

    if (reopenTutorialBtn) {
        reopenTutorialBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
            setTimeout(() => openTutorial(1), 200);
        });
    }

    if (tutorialTryBackupBtn) {
        tutorialTryBackupBtn.addEventListener('click', () => {
            if (exportDataBtn) exportDataBtn.click();
        });
    }

    const tutorialResumeSlide = localStorage.getItem(TUTORIAL_RESUME_KEY);
    if (isStandaloneMode() && tutorialResumeSlide) {
        localStorage.removeItem(TUTORIAL_RESUME_KEY);
        setTimeout(() => openTutorial(Number(tutorialResumeSlide), true), 300);
    } else if (!localStorage.getItem('seAppTutorialSeen')) {
        setTimeout(() => openTutorial(1), 300);
    }

    // 最初の一回描画
    renderResources();
    updateTodayWord();
});
