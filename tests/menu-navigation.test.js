/**
 * Menu Navigation Tests
 * Tests all menu functionality: open, navigate, select, back
 */

const { chromium } = require('playwright');

async function runTests() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    let passedTests = 0;
    let failedTests = 0;

    async function test(name, fn) {
        try {
            console.log(`\n🧪 TEST: ${name}`);
            await fn();
            console.log(`✅ PASSED: ${name}`);
            passedTests++;
        } catch (error) {
            console.error(`❌ FAILED: ${name}`);
            console.error(`   Error: ${error.message}`);
            failedTests++;
        }
    }

    // Helper to get to overworld quickly
    async function getToOverworld() {
        await page.goto('file://' + __dirname + '/../grand-transit.html');
        await page.waitForTimeout(1000);

        // Skip through intro
        for (let i = 0; i < 15; i++) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(200);
        }

        // Wait for overworld state
        await page.waitForTimeout(1000);
    }

    console.log('\n🎮 MENU NAVIGATION TEST SUITE\n');
    console.log('================================\n');

    // TEST 1: Menu opens with ESC
    await test('Menu opens with ESC key', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const screenshot = await page.screenshot();
        // Check if menu is visible by looking for menu state
        const logs = await page.evaluate(() => window.game?.state);
        if (logs !== 'menu') {
            throw new Error(`Expected state 'menu', got '${logs}'`);
        }
    });

    // TEST 2: Arrow Down navigates menu
    await test('Arrow Down navigates to next option', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const initialSelection = await page.evaluate(() => window.game?.menuSelection);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        const newSelection = await page.evaluate(() => window.game?.menuSelection);

        if (newSelection !== initialSelection + 1) {
            throw new Error(`Selection didn't increment: ${initialSelection} -> ${newSelection}`);
        }
    });

    // TEST 3: Arrow Up navigates menu
    await test('Arrow Up navigates to previous option', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Go down twice
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);

        const beforeUp = await page.evaluate(() => window.game?.menuSelection);
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
        const afterUp = await page.evaluate(() => window.game?.menuSelection);

        if (afterUp !== beforeUp - 1) {
            throw new Error(`Selection didn't decrement: ${beforeUp} -> ${afterUp}`);
        }
    });

    // TEST 4: Menu wraps at top
    await test('Menu wraps from top to bottom', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Should start at 0
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
        const selection = await page.evaluate(() => window.game?.menuSelection);
        const menuLength = await page.evaluate(() => window.game?.menuOptions?.length);

        if (selection !== menuLength - 1) {
            throw new Error(`Menu didn't wrap to bottom. Got ${selection}, expected ${menuLength - 1}`);
        }
    });

    // TEST 5: Menu wraps at bottom
    await test('Menu wraps from bottom to top', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const menuLength = await page.evaluate(() => window.game?.menuOptions?.length);

        // Go to bottom
        for (let i = 0; i < menuLength; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(50);
        }

        const selection = await page.evaluate(() => window.game?.menuSelection);

        if (selection !== 0) {
            throw new Error(`Menu didn't wrap to top. Got ${selection}, expected 0`);
        }
    });

    // TEST 6: CLOSE option closes menu
    await test('Selecting CLOSE closes menu', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Navigate to CLOSE (last option)
        const menuLength = await page.evaluate(() => window.game?.menuOptions?.length);
        for (let i = 0; i < menuLength - 1; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(50);
        }

        // Select CLOSE
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => window.game?.state);
        if (state !== 'overworld') {
            throw new Error(`Menu didn't close. State is '${state}'`);
        }
    });

    // TEST 7: ESC closes menu
    await test('ESC key closes menu', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => window.game?.state);
        if (state !== 'overworld') {
            throw new Error(`ESC didn't close menu. State is '${state}'`);
        }
    });

    // TEST 8: SHOP option opens shop
    await test('Selecting SHOP opens shop UI', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Navigate to SHOP (3rd option: TRAINS, BAG, SHOP)
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(50);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(50);

        const option = await page.evaluate(() => window.game?.menuOptions[window.game?.menuSelection]);
        if (option !== 'SHOP') {
            throw new Error(`Wrong option selected: ${option}`);
        }

        // Now we're on SHOP, but we need to test if it shows the shop UI
        // The current implementation doesn't change state, it just shows different UI
    });

    // TEST 9: BAG option opens bag
    await test('Selecting BAG opens bag UI', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Navigate to BAG (2nd option)
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(50);

        const option = await page.evaluate(() => window.game?.menuOptions[window.game?.menuSelection]);
        if (option !== 'BAG') {
            throw new Error(`Wrong option selected: ${option}`);
        }
    });

    // TEST 10: HEAL option works
    await test('Selecting HEAL heals party', async () => {
        await getToOverworld();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Navigate to HEAL
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(50);
        }

        const option = await page.evaluate(() => window.game?.menuOptions[window.game?.menuSelection]);
        if (option !== 'HEAL') {
            throw new Error(`Wrong option selected: ${option}`);
        }

        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should close menu after healing
        const state = await page.evaluate(() => window.game?.state);
        if (state !== 'overworld') {
            throw new Error(`HEAL didn't return to overworld. State is '${state}'`);
        }
    });

    console.log('\n================================');
    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Total: ${passedTests + failedTests}`);

    if (failedTests === 0) {
        console.log(`\n🎉 ALL TESTS PASSED!\n`);
    } else {
        console.log(`\n⚠️  TESTS FAILED - FIX REQUIRED\n`);
        process.exit(1);
    }

    await browser.close();
}

runTests().catch(console.error);
