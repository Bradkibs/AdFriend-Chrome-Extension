const adReplacements = new Map();

// Listen for replacement messages
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'replaceAd') {
        const { elementData, replacement } = message.data;
        replaceAdContent(elementData, replacement);
    }
});

// Replace ad content with widget content
function replaceAdContent(elementData, replacement) {
    const elements = document.querySelectorAll(
        elementData.tagName +
        elementData.classList.map(c => '.' + CSS.escape(c)).join('')
    );

    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (
            Math.abs(rect.width - elementData.rect.width) < 5 &&
            Math.abs(rect.height - elementData.rect.height) < 5 &&
            Math.abs(rect.top - elementData.rect.top) < 5 &&
            Math.abs(rect.left - elementData.rect.left) < 5
        ) {
            if (!adReplacements.has(element)) {
                const replacementDiv = document.createElement('div');
                replacementDiv.className = 'extension-content-widget';
                replacementDiv.style.cssText = `
                    width: ${rect.width}px;
                    height: ${rect.height}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-family: Arial, sans-serif;
                `;
                replacementDiv.textContent = replacement;

                element.style.display = 'none';
                element.parentNode.insertBefore(replacementDiv, element);
                adReplacements.set(element, replacementDiv);
            }
        }
    });
}