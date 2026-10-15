/**
 * Utility functions
 */

const Utils = {
    /** Calculate the adapted Gen 1 catch value (0-255). */
    calculateCatchValue(train, ballMultiplier = 1) {
        const maxHP = Math.max(1, train.maxHP || 1);
        const currentHP = Math.max(0, Math.min(maxHP, train.currentHP || 0));
        const catchRate = Math.max(1, train.catchRate || (train.species && train.species.catchRate) || 45);
        const statusMultiplier = ['slp', 'frz', 'sleep', 'frozen'].includes(train.status)
            ? 2
            : train.status ? 1.5 : 1;
        const value = ((maxHP * 3 - currentHP * 2) * catchRate * statusMultiplier * ballMultiplier) / (maxHP * 3);
        return Math.floor(this.clamp(value, 1, 255));
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random element from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Check if rectangles collide
     */
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    },

    /**
     * Create a 2D array filled with a value
     */
    create2DArray(width, height, fillValue = 0) {
        const array = [];
        for (let y = 0; y < height; y++) {
            array[y] = [];
            for (let x = 0; x < width; x++) {
                array[y][x] = fillValue;
            }
        }
        return array;
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Format number with leading zeros
     */
    padNumber(num, length) {
        return String(num).padStart(length, '0');
    },

    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * Check if a point is in a rectangle
     */
    pointInRect(px, py, rect) {
        return px >= rect.x &&
               px < rect.x + rect.width &&
               py >= rect.y &&
               py < rect.y + rect.height;
    },

    /**
     * Save data to localStorage
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    },

    /**
     * Load data from localStorage
     */
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    },

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${this.padNumber(mins, 2)}:${this.padNumber(secs, 2)}`;
    },

    /**
     * Wrap text to fit within a width
     */
    wrapText(text, maxWidth, ctx, fontSize = 16) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        ctx.font = `${fontSize}px monospace`;

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        return lines;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
