document.addEventListener('DOMContentLoaded', () => {
    console.log('App v9.9.4 starting...');
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
    setNowToInput(recordTimeInput);

    // === 初期設定の読み込み ===
    // 0. カスタムラベルの読み込みと適用
    const defaultLabels = {
        high: 'ハイ（活発・たかぶり・ざわざわ）',
        mid: '大丈夫（おだやか・マシ・いい感じ）',
        low: 'ロー（静か・おもい・おやすみ中）'
    };
    
    function loadLabels() {
        const savedLabels = JSON.parse(localStorage.getItem('seAppLabels') || 'null');
        const labels = savedLabels || defaultLabels;
        
        // ボタンに適用
        textHigh.textContent = labels.high;
        textMid.textContent = labels.mid;
        textLow.textContent = labels.low;
        
        // 設定フォームに適用
        customHigh.value = labels.high;
        customMid.value = labels.mid;
        customLow.value = labels.low;
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
    const messages = {
        'high': [
            '一生懸命に状況に対処しようとしている身体からの大切なメッセージかもしれません。もしよければ、ゆっくり10回足踏みをして、足の裏の感覚に気づいてみませんか？（スローダウン）',
            '焦りやそわそわは、身体があなたを守ろうと頑張っている証拠です。今は少しだけ、お水を一口飲んでひと息ついてみませんか？（ヘルプ・ナウ！）',
            'もし今、身体の中に強いエネルギーやざわつきを感じているなら、それはあなたを守ろうとシステムが一生懸命に働いているサインかもしれません。',
            '身体がキュッと張り詰めている時は、少しだけ視線を上げて、部屋の中にある『四角いもの』を3つ、ゆっくり見つけてみませんか？',
            '行き場のないエネルギーを感じたら、もしできれば、壁を両手でギュッと押して筋肉に力を入れてみてください。少しだけ外に逃がしてあげましょう。'
        ],
        'mid': [
            '『悪くない』『マシ』に気づけたこと、とても大きな一歩です。その感覚のまま、少しだけそこにとどまってみましょう。（シフト＆ステイ）',
            'ほんの少しでも『いい感じ』を見つけられたご自身を労ってあげてくださいね。波があるのは、神経系が環境に合わせてしなやかに生き残ろうとしている証拠です。',
            '『悪くない』『マシ』に気づけたこと、とても大きな一歩です。その感覚は、身体のどのあたりにありますか？少しだけそこにとどまってみましょう。',
            '波がある中で『いつもの自分』を見つけられたご自身を、まずは労ってあげてくださいね。神経系がしなやかに機能している証拠です。',
            '今、自然に呼吸が出たり入ったりしているのを、ただ一緒にいましょう。'
        ],
        'low': [
            '今は何も感じないことでシステムを保護する、大切な冬眠の時間ですね。無理に動かず、重力に身体を預けてみてください。',
            'バタンキューと休むことも、生き残るための立派な防衛反応です。何もしないことを選択できたご自身を、まずは労ってあげてくださいね。',
            '身体が重く感じたり、動きたくない時は、システムがあなたを休ませようとしている大切な『冬眠』の時間です。',
            'もし感覚が遠く感じられても、それは生き残るための立派な防衛反応です。無理に引き上げず、今は重力に身体を預けてみてください。',
            'エネルギーが底をついている時は、何もしないことを選択して大丈夫です。温かい毛布にくるまるなどして、まずは安全を確保してくださいね。'
        ]
    };

    stateButtons.forEach(button => {
        button.addEventListener('click', () => {
            stateButtons.forEach(btn => btn.classList.remove('selected-zone'));
            button.classList.add('selected-zone');
            selectedRecordType = button.getAttribute('data-type');
            if(submitRecordBtn) submitRecordBtn.disabled = false;
        });
    });

    if (submitRecordBtn) {
        submitRecordBtn.addEventListener('click', () => {
            if (!selectedRecordType) return;
            
            let dateToSave = new Date().toISOString();
            if (recordTimeInput && recordTimeInput.value) {
                dateToSave = new Date(recordTimeInput.value).toISOString();
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
            
            // UIリセット
            dailyMemo.value = '';
            stateButtons.forEach(btn => btn.classList.remove('selected-zone'));
            selectedRecordType = null;
            submitRecordBtn.disabled = true;
            setNowToInput(recordTimeInput);
            
            if(typeof renderReflection === 'function') renderReflection();
            if (popupToggle.checked) {
                const msgArray = messages[record.type];
                if (msgArray && msgArray.length > 0) {
                    const randomMsg = msgArray[Math.floor(Math.random() * msgArray.length)];
                    showToast(randomMsg, true); // 労いメッセージ時のみお守り保存をON
                }
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

    popupToggle.addEventListener('change', (e) => {
        localStorage.setItem('seAppToggle', e.target.checked);
    });

    // カスタマイズ保存
    saveSettingsBtn.addEventListener('click', () => {
        const newLabels = {
            high: customHigh.value || defaultLabels.high,
            mid: customMid.value || defaultLabels.mid,
            low: customLow.value || defaultLabels.low
        };
        localStorage.setItem('seAppLabels', JSON.stringify(newLabels));
        loadLabels();
        settingsModal.classList.remove('active');
        showToast('ボタンの言葉を保存しました🍵');
    });

    // カスタマイズ初期化
    resetSettingsBtn.addEventListener('click', () => {
        localStorage.removeItem('seAppLabels');
        loadLabels();
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
        const yMap = { 'high': 3, 'mid': 2, 'low': 1 };
        
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
        const chartDataPoints = recentHistory.map(r => yMap[r.type]);
        
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
                        min: 0.5,
                        max: 3.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                if (value === 3) return '🔥';
                                if (value === 2) return '☕️';
                                if (value === 1) return '❄️';
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
            high: 'ハイ（活発・たかぶり・ざわざわ）',
            mid: '大丈夫（おだやか・マシ・いい感じ）',
            low: 'ロー（静か・おもい・おやすみ中）'
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
                    dot.className = `cal-dot dot-${record.type}`;
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
                            
                            const zoneLabel = `${emojiMap[record.type]} ${savedLabels[record.type]}`;
                            item.innerHTML = `
                                <div class="timeline-time">${timeStr}</div>
                                <div class="timeline-content">
                                    <div class="timeline-zone">${zoneLabel}</div>
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
            if (files.length > 5) {
                alert('一度に保存できる写真は5枚までです。最初の5枚を処理します。');
                filesToProcess = files.slice(0, 5);
            }

            if (loadingOverlay) loadingOverlay.classList.add('active');

            let newResources = [];
            const timestamp = new Date().toISOString();

            try {
                if (filesToProcess.length > 0) {
                    for (let i = 0; i < filesToProcess.length; i++) {
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
        
        seAppResources.forEach(res => {
            // 写真ギャラリー（グリッド表示）
            if (res.photoStr && photoGalleryTab) {
                const item = document.createElement('div');
                item.className = 'photo-grid-item';
                item.innerHTML = `<img src="${res.photoStr}" alt="写真">`;
                
                item.addEventListener('click', () => {
                    if (photoViewImg) photoViewImg.src = res.photoStr;
                    if (photoViewText) photoViewText.textContent = res.text || '';
                    if (photoViewResourceId) photoViewResourceId.value = res.id;
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
                const data = {
                    seAppSettings: localStorage.getItem('seAppSettings') || '{}',
                    seAppHistory: localStorage.getItem('seAppHistory') || '[]',
                    seAppResources: localStorage.getItem('seAppResources') || '[]'
                };
                const jsonStr = JSON.stringify(data);
                const blob = new Blob([jsonStr], { type: 'application/json' });
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
            if (confirm('現在のデータ（あれば）の上書きとなります。復元してよろしいですか？')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    alert('ただいま記憶を復元しています…\nOKを押してしばらくお待ちください。');
                    setTimeout(() => {
                        try {
                            const parsedData = JSON.parse(e.target.result);
                            if (parsedData.seAppHistory || parsedData.seAppResources) {
                                localStorage.setItem('seAppSettings', parsedData.seAppSettings || '{}');
                                localStorage.setItem('seAppHistory', parsedData.seAppHistory || '[]');
                                localStorage.setItem('seAppResources', parsedData.seAppResources || '[]');
                                alert('復元が完了しました。画面を再読み込みします。');
                                window.location.reload();
                            } else {
                                alert('データ形式が正しくありません。正しいJSONファイルを選択してください。');
                            }
                        } catch (err) {
                            console.error(err);
                            alert('データの復元に失敗しました。ファイルが破損している可能性があります。');
                        }
                    }, 100); // UIスレッドのブロックを少し緩和
                };
                reader.onerror = () => {
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

    // 最初の一回描画
    renderResources();
    updateTodayWord();
});
