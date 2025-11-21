/**
 * 📖 Read Novel Vocab Engine - Open Source Edition
 * ---------------------------------------------------------------------------
 * 这是一个基于艾宾浩斯遗忘曲线的英语学习引擎演示版。
 *
 * 🚀 想要完整体验 (50篇连载 + 4000词)？
 * 请先访问web demo: https://wordnovelwebdemo.click
 * 或关注开发者小红书: @kylin的小世界
 * ---------------------------------------------------------------------------
 * @author @kylin的小世界
 * @license GPL-3.0
 */

import { inject } from '@vercel/analytics';
inject();

// src/js/main.js

import { DataManager } from './DataManager.js';

// ========== 数据存储键名 ==========
const STORAGE_KEYS = {
    LEARNING_SESSIONS: 'word_novel_learning_sessions',
    STORY_PROGRESS: 'word_novel_story_progress',
    MODE_USAGE: 'word_novel_mode_usage',  // 记录模式使用情况
    DETAILED_PROGRESS: 'word_novel_detailed_progress',  // 细粒度进度：{storyId: {step1: 0-1, step2: {clickedWords: [], progress: 0-1}, ...}}
    DIFFICULT_WORDS: 'word_novel_difficult_words'  // 生词本：收藏的单词数组
};
// 暴露到全局作用域，供 settings.html 等内联脚本使用
window.STORAGE_KEYS = STORAGE_KEYS;

let currentTimingContext = { storyId: null, mode: null };
window.currentTimingContext = currentTimingContext;

const LEARNING_LOG_INTERVAL_SECONDS = 60;
let learningTimerInitialized = false;
let learningTimerId = null;
let learningLastTimestamp = null;
let learningAccumulatedSeconds = 0;
let learningTrackedMode = 'step1';
let pageHideListenerAdded = false;

function setTimingContext(newContext = {}) {
    currentTimingContext = { ...currentTimingContext, ...newContext };
    window.currentTimingContext = currentTimingContext;
    if (newContext.mode) {
        learningTrackedMode = newContext.mode;
    }
}
window.setTimingContext = setTimingContext;

function setLearningMode(mode) {
    if (!mode) return;
    learningTrackedMode = mode;
    currentTimingContext.mode = mode;
    window.currentTimingContext = currentTimingContext;
}
window.setLearningMode = setLearningMode;

function initializeLearningTimer() {
    if (learningTimerInitialized || !currentTimingContext.storyId) {
        return;
    }
    learningTimerInitialized = true;
    learningTrackedMode = currentTimingContext.mode || learningTrackedMode || 'step1';
    learningAccumulatedSeconds = 0;
    learningLastTimestamp = Date.now();
    startLearningInterval();
    document.addEventListener('visibilitychange', handleLearningVisibilityChange);
    window.addEventListener('beforeunload', handleLearningBeforeUnload);
    if (!pageHideListenerAdded) {
        document.addEventListener('pagehide', handleLearningPageHide, { capture: true });
        pageHideListenerAdded = true;
    }
}
window.initializeLearningTimer = initializeLearningTimer;

function startLearningInterval() {
    if (learningTimerId) {
        return;
    }
    learningLastTimestamp = Date.now();
    learningTimerId = setInterval(tickLearningTime, 5000);
}
window.startLearningInterval = startLearningInterval;

function stopLearningInterval() {
    if (learningTimerId) {
        clearInterval(learningTimerId);
        learningTimerId = null;
    }
}
window.stopLearningInterval = stopLearningInterval;

function tickLearningTime() {
    if (learningLastTimestamp === null || document.hidden) {
        return;
    }
    const now = Date.now();
    learningAccumulatedSeconds += (now - learningLastTimestamp) / 1000;
    learningLastTimestamp = now;
    flushLearningBuffer(false);
}
window.tickLearningTime = tickLearningTime;

function flushLearningBuffer(force = false, modeOverride = null) {
    const modeToUse = modeOverride || learningTrackedMode || currentTimingContext.mode;
    const storyId = currentTimingContext.storyId;
    if (!modeToUse || !storyId) {
        return;
    }
    let secondsToRecord = 0;
    if (force) {
        secondsToRecord = learningAccumulatedSeconds;
    } else if (learningAccumulatedSeconds >= LEARNING_LOG_INTERVAL_SECONDS) {
        secondsToRecord = Math.floor(learningAccumulatedSeconds / LEARNING_LOG_INTERVAL_SECONDS) * LEARNING_LOG_INTERVAL_SECONDS;
    }

    if (secondsToRecord <= 0) {
        return;
    }

    const minutes = secondsToRecord / 60;
    try {
        recordLearningSession(storyId, Number(minutes.toFixed(2)), modeToUse);
    } catch (error) {
        console.error('记录学习时长失败:', error);
    }
    learningAccumulatedSeconds -= secondsToRecord;
    if (learningAccumulatedSeconds < 0) {
        learningAccumulatedSeconds = 0;
    }
}
window.flushLearningBuffer = flushLearningBuffer;

function resetLearningAccumulator() {
    learningAccumulatedSeconds = 0;
}
window.resetLearningAccumulator = resetLearningAccumulator;

function handleLearningVisibilityChange() {
    if (document.hidden) {
        tickLearningTime();
        flushLearningBuffer(true);
        stopLearningInterval();
        learningLastTimestamp = null;
    } else {
        learningLastTimestamp = Date.now();
        startLearningInterval();
    }
}
window.handleLearningVisibilityChange = handleLearningVisibilityChange;

function handleLearningBeforeUnload() {
    tickLearningTime();
    flushLearningBuffer(true);
}
window.handleLearningBeforeUnload = handleLearningBeforeUnload;

function handleLearningPageHide() {
    tickLearningTime();
    flushLearningBuffer(true);
}

// 1. 初始化 DataManager 并挂载到 window
//    (这样你遗留的、非模块化的 JS 脚本也许还能访问到它)
window.dataManager = new DataManager();

// --- 兼容旧的内联脚本 (index.html) ---
// index.html 的内联脚本在 'loadStoryList' 函数中需要这个
// 我们创建它，并让它返回已加载的数据
window.getAllStories = () => {
    // 检查 window.dataManager 是否已初始化并且数据已加载
    if (window.dataManager && window.dataManager.appData) {
        return window.dataManager.appData; // 返回我们刚加载的10篇故事数据
    }

    // 这是一个备用措施，以防它在数据加载前被调用
    console.warn("getAllStories was called before dataManager.appData was ready.");
    return []; // 返回空数组以防崩溃
};
// --- 兼容结束 ---

// --- 兼容 index.html (getDetailedProgress) ---
function getDetailedProgress() {
    try {
        const data = localStorage.getItem('word_novel_detailed_progress');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('读取细粒度进度失败:', error);
        return {};
    }
}
window.getDetailedProgress = getDetailedProgress;
// --- 兼容结束 ---

// --- 兼容 story.html (getStoryById) ---
function getStoryById(storyId) {
    if (!storyId) {
        return null;
    }

    if (window.dataManager && Array.isArray(window.dataManager.appData)) {
        return window.dataManager.appData.find(story => story.id === storyId) || null;
    }

    console.warn('getStoryById was called before dataManager.appData was ready.');
    return null;
}
window.getStoryById = getStoryById;
// --- 兼容结束 ---

// --- 兼容 story.html (点击进度) ---
function recordWordClick(storyId, step, wordId, totalWords) {
    if (!storyId || !step || !wordId || !totalWords) {
        console.error('recordWordClick 参数不完整:', { storyId, step, wordId, totalWords });
        return;
    }

    const detailedProgress = getDetailedProgress();
    if (!detailedProgress[storyId]) {
        detailedProgress[storyId] = {};
    }
    if (!detailedProgress[storyId][step]) {
        detailedProgress[storyId][step] = { clickedWords: [], progress: 0 };
    }

    const stepData = detailedProgress[storyId][step];
    
    // 保存或更新总单词数（使用更大的值，确保准确性）
    // 如果传入的 totalWords 比已保存的值更大，说明之前的值可能不准确，需要更新
    if (!stepData.totalWords || totalWords > stepData.totalWords) {
        stepData.totalWords = totalWords;
    }
    
    // 使用保存的总单词数（而不是传入的可能不准确的值）
    const actualTotalWords = stepData.totalWords || totalWords;

    if (!stepData.clickedWords.includes(wordId)) {
        stepData.clickedWords.push(wordId);
        const clickedCount = stepData.clickedWords.length;
        // 使用保存的总单词数重新计算进度
        stepData.progress = Math.min(1, clickedCount / actualTotalWords);
        saveDetailedProgress(detailedProgress);
        updateTotalProgress(storyId);
    } else {
        // 即使单词已点击过，也要重新计算进度（以防 totalWords 被更新）
        const clickedCount = stepData.clickedWords.length;
        stepData.progress = Math.min(1, clickedCount / actualTotalWords);
        saveDetailedProgress(detailedProgress);
    }
}

function getClickedWords(storyId, step) {
    const detailedProgress = getDetailedProgress();
    return detailedProgress[storyId]?.[step]?.clickedWords || [];
}

function saveClickedWords(storyId, step, clickedWords) {
    if (!storyId || !step) return;
    const detailedProgress = getDetailedProgress();
    if (!detailedProgress[storyId]) {
        detailedProgress[storyId] = {};
    }
    if (!detailedProgress[storyId][step]) {
        detailedProgress[storyId][step] = { clickedWords: [], progress: 0 };
    }
    detailedProgress[storyId][step].clickedWords = Array.from(new Set(clickedWords));
    const totalWords = detailedProgress[storyId][step].totalWords || clickedWords.length || 1;
    detailedProgress[storyId][step].progress = Math.min(1, (clickedWords.length || 0) / totalWords);
    saveDetailedProgress(detailedProgress);
    updateTotalProgress(storyId);
}

function saveDetailedProgress(detailedProgress) {
    try {
        localStorage.setItem('word_novel_detailed_progress', JSON.stringify(detailedProgress));
    } catch (error) {
        console.error('保存细粒度进度失败:', error);
    }
}

function updateTotalProgress(storyId) {
    const detailedProgress = getDetailedProgress();
    const storyProgress = detailedProgress[storyId] || {};

    const step1Progress = (storyProgress.step1 || 0) * 0.25;
    const step2Progress = (storyProgress.step2?.progress || 0) * 0.25;
    const step3Progress = (storyProgress.step3?.progress || 0) * 0.25;
    const step4Progress = (storyProgress.step4 || 0) * 0.25;

    const totalProgress = step1Progress + step2Progress + step3Progress + step4Progress;
    updateStoryProgress(storyId, totalProgress);
}

window.recordWordClick = recordWordClick;
window.getClickedWords = getClickedWords;
window.saveClickedWords = saveClickedWords;
window.saveDetailedProgress = saveDetailedProgress;
window.updateTotalProgress = updateTotalProgress;
// --- 兼容结束 ---

// --- 兼容 story.html (生词本) ---
function getDifficultWords() {
    try {
        const data = localStorage.getItem('word_novel_difficult_words');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('读取生词本失败:', error);
        return [];
    }
}

function saveDifficultWords(words) {
    try {
        localStorage.setItem('word_novel_difficult_words', JSON.stringify(words));
    } catch (error) {
        console.error('保存生词本失败:', error);
    }
}

function addDifficultWord(word, phonetic, meaning, storyId = '') {
    if (!word || !meaning) {
        console.error('添加生词失败：单词和释义不能为空');
        return false;
    }

    const words = getDifficultWords();
    const exists = words.some(w => w.word === word && w.meaning === meaning);
    if (exists) {
        return false;
    }

    words.push({
        word,
        phonetic: phonetic || '',
        meaning,
        storyId,
        addedAt: new Date().toISOString(),
    });

    saveDifficultWords(words);
    return true;
}

function removeDifficultWord(word, meaning) {
    const words = getDifficultWords();
    const initialLength = words.length;

    const filtered = words.filter(w => !(w.word === word && w.meaning === meaning));

    if (filtered.length < initialLength) {
        saveDifficultWords(filtered);
        return true;
    }

    return false;
}

function isWordInDifficultWords(word, meaning) {
    const words = getDifficultWords();
    return words.some(w => w.word === word && w.meaning === meaning);
}

window.getDifficultWords = getDifficultWords;
window.saveDifficultWords = saveDifficultWords;
window.addDifficultWord = addDifficultWord;
window.removeDifficultWord = removeDifficultWord;
window.isWordInDifficultWords = isWordInDifficultWords;
// --- 兼容结束 ---

// --- 兼容 story.html (统计计时) ---
function getStoryProgressData() {
    try {
        const data = localStorage.getItem('word_novel_story_progress');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('读取故事进度失败:', error);
        return {};
    }
}

function saveStoryProgressData(progressData) {
    try {
        localStorage.setItem('word_novel_story_progress', JSON.stringify(progressData));
    } catch (error) {
        console.error('保存故事进度失败:', error);
    }
}

function getStoryProgress(storyId) {
    const progressData = getStoryProgressData();
    return progressData[storyId] || 0;
}

function updateStoryProgress(storyId, progress) {
    const progressData = getStoryProgressData();
    progressData[storyId] = Math.max(progressData[storyId] || 0, Math.min(1, progress));
    saveStoryProgressData(progressData);
    return progressData[storyId];
}

function updateStep1Progress(storyId, progress) {
    const detailedProgress = getDetailedProgress();
    if (!detailedProgress[storyId]) {
        detailedProgress[storyId] = {};
    }
    const currentProgress = detailedProgress[storyId].step1 || 0;
    if (progress >= 1 || progress > currentProgress) {
        detailedProgress[storyId].step1 = Math.min(1, Math.max(currentProgress, progress));
        saveDetailedProgress(detailedProgress);
        updateTotalProgress(storyId);
    }
}

function updateProgressFromModeUsage(storyId) {
    updateTotalProgress(storyId);
}

function updateStep4Progress(storyId, progress) {
    const detailedProgress = getDetailedProgress();
    if (!detailedProgress[storyId]) {
        detailedProgress[storyId] = {};
    }
    const currentProgress = detailedProgress[storyId].step4 || 0;
    if (progress >= 1 || progress > currentProgress) {
        detailedProgress[storyId].step4 = Math.min(1, Math.max(currentProgress, progress));
        saveDetailedProgress(detailedProgress);
        updateTotalProgress(storyId);
    }
}

function getModeUsage() {
    try {
        const data = localStorage.getItem('word_novel_mode_usage');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('读取模式使用记录失败:', error);
        return {};
    }
}

function saveModeUsage(modeUsage) {
    try {
        localStorage.setItem('word_novel_mode_usage', JSON.stringify(modeUsage));
    } catch (error) {
        console.error('保存模式使用记录失败:', error);
    }
}

function recordModeUsage(storyId, mode) {
    const modeUsage = getModeUsage();

    if (!modeUsage[storyId]) {
        modeUsage[storyId] = [];
    }

    if (!modeUsage[storyId].includes(mode)) {
        modeUsage[storyId].push(mode);
        saveModeUsage(modeUsage);
        updateProgressFromModeUsage(storyId);
    }
}

function getLearningSessions() {
    try {
        const data = localStorage.getItem('word_novel_learning_sessions');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('读取学习数据失败:', error);
        return [];
    }
}

function saveLearningSessions(sessions) {
    try {
        localStorage.setItem('word_novel_learning_sessions', JSON.stringify(sessions));
    } catch (error) {
        console.error('保存学习数据失败:', error);
    }
}

function recordLearningSession(storyId, duration, mode = 'step1') {
    const sessions = getLearningSessions();
    const session = {
        storyId,
        duration,
        mode,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
    };

    sessions.push(session);
    saveLearningSessions(sessions);
    return session;
}

function getLearningData() {
    return {
        sessions: getLearningSessions(),
        progress: getStoryProgressData(),
        modeUsage: getModeUsage()
    };
}

function calculateStats(learningData) {
    const sessions = learningData.sessions || [];
    const progressData = learningData.progress || {};
    
    const today = new Date().toISOString().split('T')[0];
    
    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weekDates.push(date.toISOString().split('T')[0]);
    }
    
    const totalTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    
    const todayTime = sessions
        .filter(s => s.date === today)
        .reduce((sum, session) => sum + (session.duration || 0), 0);
    
    const weekTime = sessions
        .filter(s => weekDates.includes(s.date))
        .reduce((sum, session) => sum + (session.duration || 0), 0);
    
    const allStories = getAllStoriesSync();
    const totalStories = allStories.length;
    const completedStories = Object.values(progressData).filter(p => p >= 1).length;
    const totalProgress = totalStories > 0 
        ? (Object.values(progressData).reduce((sum, p) => sum + (p || 0), 0) / totalStories) * 100
        : 0;
    
    const consecutiveDays = calculateConsecutiveDays(sessions);
    
    return {
        totalTime,
        todayTime,
        weekTime,
        completedStories,
        totalStories,
        totalProgress,
        consecutiveDays
    };
}

function calculateConsecutiveDays(sessions) {
    if (!sessions.length) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    if (!dates.length) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    let consecutiveDays = 0;
    
    const startDate = dates.includes(today) ? today : dates[0];
    
    let currentDate = new Date(startDate);
    let index = 0;
    
    while (index < dates.length) {
        const checkDate = currentDate.toISOString().split('T')[0];
        if (dates.includes(checkDate)) {
            consecutiveDays++;
            currentDate.setDate(currentDate.getDate() - 1);
            index++;
        } else {
            break;
        }
    }
    
    return consecutiveDays;
}

function getTimeDataForChart(learningData) {
    const sessions = learningData.sessions || [];
    
    const labels = [];
    const dateMap = {};
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        labels.push(label);
        dateMap[dateStr] = 0;
    }
    
    sessions.forEach(session => {
        if (dateMap.hasOwnProperty(session.date)) {
            dateMap[session.date] += session.duration || 0;
        }
    });
    
    const values = Object.values(dateMap);
    
    return { labels, values };
}

function getProgressDataForChart(learningData) {
    const progressData = learningData.progress || {};
    const buckets = {
        completed: 0,
        inProgress: 0,
        notStarted: 0
    };
    
    Object.values(progressData).forEach(progress => {
        if (progress >= 1) {
            buckets.completed++;
        } else if (progress > 0) {
            buckets.inProgress++;
        } else {
            buckets.notStarted++;
        }
    });
    
    return buckets;
}

function getAllStoriesSync() {
    return window.dataManager?.appData || [];
}

window.recordModeUsage = recordModeUsage;
window.recordLearningSession = recordLearningSession;
window.getLearningSessions = getLearningSessions;
window.getStoryProgressData = getStoryProgressData;
window.getStoryProgress = getStoryProgress;
window.updateStoryProgress = updateStoryProgress;
window.updateStep1Progress = updateStep1Progress;
window.updateProgressFromModeUsage = updateProgressFromModeUsage;
window.updateStep4Progress = updateStep4Progress;
window.getModeUsage = getModeUsage;
window.saveModeUsage = saveModeUsage;
window.getLearningData = getLearningData;
window.calculateStats = calculateStats;
window.calculateConsecutiveDays = calculateConsecutiveDays;
window.getTimeDataForChart = getTimeDataForChart;
window.getProgressDataForChart = getProgressDataForChart;
window.getAllStoriesSync = getAllStoriesSync;
// --- 兼容结束 ---

// 2. 页面加载完毕后，立即加载数据
document.addEventListener('DOMContentLoaded', async () => {
    
    await window.dataManager.loadData();
    console.log("数据已加载:", window.dataManager.appData);
    document.dispatchEvent(new CustomEvent('appDataReady'));
    window.dispatchEvent(new CustomEvent('stories-ready'));
    
    // 3. 在这里调用你以前的"主函数"
    //    比如，你可能有一个函数叫 renderStoryList()
    //    你现在就可以调用它，并把数据传进去：
    //    if (typeof renderStoryList === 'function') {
    //        renderStoryList(window.dataManager.appData);
    //    }
    
    // 4. (可选) 添加反调试和禁止右键
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    console.log("Vite App 已启动");
});

// 5. (重要) 将你以前在 HTML 中内联的、或在其他 <script> 标签中的
//    全局函数、事件监听器等，逐步迁移到这个文件或新的模块中。
//    例如，你原来的 `loadStoryList` 函数就可以移到这里，
//    并改成 `window.dataManager.loadData()`。

