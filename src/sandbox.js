class AdClassifier {
    constructor() {
        this.model = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            await tf.ready();
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({ units: 16, inputShape: [4], activation: 'relu' }),
                    tf.layers.dense({ units: 8, activation: 'relu' }),
                    tf.layers.dense({ units: 1, activation: 'sigmoid' })
                ]
            });

            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            // Initialize with some basic training data
            await this.trainInitial();
            this.initialized = true;
        } catch (error) {
            console.error("Model initialization failed:", error);
        }
    }

    async trainInitial() {
        // Sample training data (position/size patterns common to ads)
        const trainingData = tf.tensor2d([
            [0.2, 0.3, 0.1, 0.8],  // Common sidebar ad
            [0.8, 0.2, 0.9, 0.1],  // Top banner
            [0.3, 0.4, 0.5, 0.5],  // In-content ad
            [0.1, 0.1, 0.2, 0.2],  // Non-ad small element
            [0.9, 0.9, 0.5, 0.5],  // Non-ad large element
        ]);

        const labels = tf.tensor2d([
            [1], // Ad
            [1], // Ad
            [1], // Ad
            [0], // Not ad
            [0]  // Not ad
        ]);

        await this.model.fit(trainingData, labels, {
            epochs: 50,
            batchSize: 2,
            shuffle: true
        });
    }

    async predict(features) {
        if (!this.initialized) await this.initialize();
        const tensorFeatures = tf.tensor2d([features]);
        const prediction = this.model.predict(tensorFeatures);
        const result = prediction.dataSync()[0];
        tensorFeatures.dispose();
        prediction.dispose();
        return result;
    }
}

const classifier = new AdClassifier();
classifier.initialize();

// Message handling
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.target === 'sandbox' && msg.type === 'predict') {
        const features = [
            msg.data.rect.width / msg.data.windowWidth,
            msg.data.rect.height / msg.data.windowHeight,
            msg.data.rect.top / msg.data.windowHeight,
            msg.data.rect.left / msg.data.windowWidth
        ];

        classifier.predict(features).then(prediction => {
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'prediction',
                data: {
                    isAd: prediction > 0.7,
                    elementData: msg.data,
                    tabId: sender.tab?.id
                }
            });
        });

        return true;
    }
});