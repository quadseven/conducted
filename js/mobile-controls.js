/**
 * Mobile Touch Controls Handler
 */

class MobileControls {
    constructor(inputHandler) {
        this.inputHandler = inputHandler;
        this.isMobile = this.detectMobile();
        this.activeButtons = new Set();

        if (this.isMobile) {
            this.setupTouchControls();
            this.showMobileControls();
        }
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }

    showMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'flex';
        }
    }

    setupTouchControls() {
        // D-Pad buttons
        ['up', 'down', 'left', 'right'].forEach(direction => {
            const button = document.getElementById(`btn-${direction}`);
            if (button) {
                this.addTouchListeners(button, direction);
            }
        });

        // Action buttons
        ['a', 'b', 'start', 'menu'].forEach(action => {
            const button = document.getElementById(`btn-${action}`);
            if (button) {
                const key = button.getAttribute('data-key') || action;
                this.addTouchListeners(button, key);
            }
        });

        // Prevent default touch behavior on buttons
        document.querySelectorAll('.dpad-btn, .action-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => e.preventDefault());
            btn.addEventListener('touchend', (e) => e.preventDefault());
            btn.addEventListener('touchmove', (e) => e.preventDefault());
        });
    }

    addTouchListeners(button, key) {
        // Touch start
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleButtonPress(button, key);
        }, { passive: false });

        // Touch end
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleButtonRelease(button, key);
        }, { passive: false });

        // Touch cancel (when finger moves off button)
        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.handleButtonRelease(button, key);
        }, { passive: false });

        // Mouse support for testing on desktop
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleButtonPress(button, key);
        });

        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.handleButtonRelease(button, key);
        });

        button.addEventListener('mouseleave', (e) => {
            this.handleButtonRelease(button, key);
        });
    }

    handleButtonPress(button, key) {
        button.classList.add('active');
        this.activeButtons.add(key);

        // Simulate key press in input handler
        this.inputHandler.simulateKeyPress(key);

        // Haptic feedback on supported devices
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    handleButtonRelease(button, key) {
        button.classList.remove('active');
        this.activeButtons.delete(key);

        // Simulate key release in input handler
        this.inputHandler.simulateKeyRelease(key);
    }

    isButtonActive(key) {
        return this.activeButtons.has(key);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileControls;
}
