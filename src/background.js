let easyListRules = [];
let contentWidget;
let sandboxReady = false;

class ContentWidget {
    constructor() {
        this.quotes = [];
        this.activities = [];
        this.reminders = [];
        this.dailyQuote = null;
    }

    async initialize(option) {
        switch (option) {
            case "randomLocal":
                this.getRandomContent();
                break;
            case "fetchQuote":
                const stored = await chrome.storage.sync.get([
                    'customQuotes',
                    'customActivities',
                    'customReminders'
                ]);

                this.quotes = stored.customQuotes ?? [
                    "Every moment is a fresh beginning.",
                    "Make today amazing!",
                    "You got this!",
                    "Small steps, big changes."
                ];

                this.activities = stored.customActivities ?? [
                    "Time for a quick stretch!",
                    "Have you had water recently?",
                    "Take a deep breath.",
                    "Stand up and move around!"
                ];

                this.reminders = stored.customReminders ?? [
                    "Remember to drink water.",
                    "Take a short break if needed.",
                    "You're doing great!",
                    "Stay positive!"
                ];

                await this.fetchDailyQuote();
                this.setupStorageListener();
                break;
        }
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.customQuotes) this.quotes = changes.customQuotes.newValue;
            if (changes.customActivities) this.activities = changes.customActivities.newValue;
            if (changes.customReminders) this.reminders = changes.customReminders.newValue;
        });
    }

    async fetchDailyQuote() {
        try {
            const response = await fetch('https://zenquotes.io/api/random');
            const data = await response.json();
            this.dailyQuote = {
                content: data.content,
                author: data.author
            };
        } catch (error) {
            console.warn("Failed to fetch daily quote", error);
        }
    }

    getRandomContent(type = 'random') {
        let content = '';
        switch(type) {
            case 'quote':
                content = this.dailyQuote ?
                    `"${this.dailyQuote.content}" - ${this.dailyQuote.author}` :
                    this.quotes[Math.floor(Math.random() * this.quotes.length)];
                break;
            case 'activity':
                content = this.activities[Math.floor(Math.random() * this.activities.length)];
                break;
            case 'reminder':
                content = this.reminders[Math.floor(Math.random() * this.reminders.length)];
                break;
            default:
                const allContent = [...this.quotes, ...this.activities, ...this.reminders];
                if (this.dailyQuote) {
                    allContent.push(`"${this.dailyQuote.content}" - ${this.dailyQuote.author}`);
                }
                content = allContent[Math.floor(Math.random() * allContent.length)];
        }
        return content;
    }
}

async function fetchEasyList() {
    try {
        const response = await fetch('https://easylist.to/easylist/easylist.txt');
        const text = await response.text();
        easyListRules = text.split('\n').filter(line => line && !line.startsWith('!'));
    } catch (error) {
        console.error('Error fetching EasyList:', error);
        easyListRules = [];
    }
}



// Initialize sandbox for TensorFlow processing
async function initializeSandbox() {
    try {
        if (!await chrome.offscreen.hasDocument()) {
            await chrome.offscreen.createDocument({
                url: chrome.runtime.getURL('src/sandbox.html'),
                reasons: ['WORKERS'],
                justification: 'ML processing'
            });
        }
        sandboxReady = await chrome.offscreen.hasDocument();
    } catch (error) {
        console.error("Sandbox initialization failed:", error);
    }
}

// Message handling for communication between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "checkElement") {
        if (!sandboxReady) {
            console.warn("Sandbox not ready");
            return;
        }

        // Add window dimensions to the data
        const enrichedData = {
            ...message.data,
            windowWidth: sender.tab?.width || window.innerWidth,
            windowHeight: sender.tab?.height || window.innerHeight
        };

        // Forward to sandbox for ML processing
        chrome.runtime.sendMessage({
            target: 'sandbox',
            type: 'predict',
            data: enrichedData
        });
    }

    if (message.target === 'background' && message.type === 'prediction') {
        handlePrediction(message.data);
    }
});

// Handle ML predictions and content replacement
async function handlePrediction({ isAd, elementData, tabId }) {
    if (!isAd) return;

    try {
        // Check against easyList rules
        const matchesEasyList = easyListRules.some(rule =>
            elementData.classList.some(className =>
                className.includes(rule.replace(/[^a-zA-Z0-9-_]/g, ''))
            )
        );

        if (isAd || matchesEasyList) {
            // Get replacement content
            const replacement = contentWidget.getRandomContent();

            // Send message to content script with specific target element info
            chrome.tabs.sendMessage(tabId, {
                type: 'replaceAd',
                data: {
                    selector: buildSelector(elementData),
                    rect: elementData.rect,
                    replacement
                }
            });
        }
    } catch (error) {
        console.error("Error in handlePrediction:", error);
    }
}

function buildSelector(elementData) {
    const classSelectors = elementData.classList
        .map(className => `.${CSS.escape(className)}`)
        .join('');
    return `${elementData.tagName}${classSelectors}`;
}

// Initialize components
async function initialize() {
    try {
        await fetchEasyList();
        contentWidget = new ContentWidget();
        const dataFetched = await contentWidget.initialize("fetchQuote");
        console.log("This is the data fetched from Zenquotes page",dataFetched );
        await initializeSandbox();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

// Content refresh alarm
chrome.alarms.create({ periodInMinutes: 1/600 });
chrome.alarms.onAlarm.addListener(() => {
    // if (contentWidget) {
    //     contentWidget.fetchDailyQuote();
    // }
});

initialize();
