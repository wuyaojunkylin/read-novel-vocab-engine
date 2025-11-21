// src/js/DataManager.js

// 这个仓库是 Demo 专用，所以我们硬编码为 true
const IS_DEMO = true; 

export class DataManager {
    constructor() {
        // Vite 会自动处理 / 开头的路径
        this.dataFile = IS_DEMO ? '/data_demo.json' : '/data_full.json';
        this.isDemo = IS_DEMO;
        this.appData = null;
    }
    
    /**
     * 加载数据文件
     * @returns {Promise<Object|null>}
     */
    async loadData() {
        try {
            const response = await fetch(this.dataFile);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.appData = await response.json();
            
            if (this.isDemo) {
                this.addDemoRestrictions();
            }
            return this.appData;
        } catch (error) {
            console.error('数据加载失败:', error);
            // 可以在此显示一个用户友好的错误提示
            return null;
        }
    }
    
    /**
     * 添加 Demo 版的限制或特殊逻辑
     */
    addDemoRestrictions() {
        // 比如，你可以在这里修改 this.appData，
        // 在第10篇故事的数据中添加一个特殊标记
        console.log("Demo 限制已启用");
    }
    
    /**
     * 显示升级弹窗（聚焦小红书）
     */
    showUpgradePrompt() {
        if (document.querySelector('.upgrade-prompt-overlay')) return;

        const html = `
        <style>
            .upgrade-prompt-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center;
                z-index: 1000; opacity: 0; animation: fadeIn 0.3s forwards;
            }
            .upgrade-prompt {
                background: #ffffff; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                width: 90%; max-width: 400px;
                text-align: center;
                padding: 2.5rem 2rem; transform: scale(0.9); animation: popIn 0.3s 0.1s forwards;
            }
            .upgrade-prompt h3 {
                font-size: 1.6rem; margin-top: 0; margin-bottom: 1.5rem; color: #333;
            }
            .upgrade-prompt p {
                font-size: 1rem; color: #555; line-height: 1.4; margin-bottom: 1rem;
            }
            .upgrade-prompt .upgrade-desc {
                font-size: 0.95rem;
                color: #555;
                line-height: 1.5;
                margin-bottom: 0.8rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .upgrade-prompt .qrcode-placeholder {
                width: 180px;
                height: 180px;
                background: #f0f0f0; margin: 0.5rem auto;
                border-radius: 8px; display: flex; align-items: center; justify-content: center;
                font-size: 0.9rem; color: #888;
            }
            .upgrade-prompt .account-name {
                font-weight: bold; color: #d9539e; /* 小红书颜色 */
                margin-top: 1rem;
                font-size: 1.1rem;
            }
            .upgrade-prompt .close-button {
                margin-top: 2rem; padding: 0.75rem 1.5rem; background: #f1f1f1;
                border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;
                color: #555; transition: background 0.2s;
            }
            .upgrade-prompt .close-button:hover { background: #e0e0e0; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        </style>
        <div class="upgrade-prompt-overlay" onclick="this.remove()">
            <div class="upgrade-prompt" onclick="event.stopPropagation()">
                
                <h3>完整版小程序开发中</h3>
                <img src="/xhs_qr.png" alt="小红书 @kylin的小世界" style="width: 180px; height: 180px; border-radius: 8px;">
                <p class="account-name">小红书 @kylin的小世界</p>
                <p class="upgrade-desc">我是开发者 Kylin。想获取<strong>第一时间上线通知</strong>和开发进度吗？</p>
                <p class="upgrade-desc">请<strong>关注我的小红书</strong>，有任何建议或 bug 也欢迎私信我！</p>
                <button class="close-button" onclick="this.closest('.upgrade-prompt-overlay').remove()">
                    好的，我关掉了
                </button>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }
}

