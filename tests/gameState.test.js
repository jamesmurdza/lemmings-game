/**
 * Tests for Game State Management
 * Tests game state initialization, updates, and win/lose conditions
 */

// Constants
const MAX_LEMMINGS = 15;
const SPAWN_INTERVAL = 120;

// Mock game state factory
function createGameState(canvas = { width: 800, height: 600 }) {
    return {
        lemmings: [],
        terrain: [],
        selectedTool: 'none',
        released: 0,
        saved: 0,
        lost: 0,
        toolUses: 10,
        frameCount: 0,
        gameOver: false,
        entrance: { x: 80, y: 50 },
        exit: { x: canvas.width - 80, y: canvas.height - 60 },
        message: ''
    };
}

// Mock Lemming for testing
class MockLemming {
    constructor(state = 'walking') {
        this.state = state;
    }
}

// Test utilities
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`FAIL: ${message} - Expected ${expected}, got ${actual}`);
    }
    console.log(`PASS: ${message}`);
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function assertFalse(condition, message) {
    if (condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

// Game logic functions
function shouldSpawnLemming(gameState) {
    return gameState.frameCount % SPAWN_INTERVAL === 0 &&
           gameState.released < MAX_LEMMINGS &&
           !gameState.gameOver;
}

function spawnLemming(gameState) {
    if (gameState.released < MAX_LEMMINGS && !gameState.gameOver) {
        gameState.lemmings.push(new MockLemming('falling'));
        gameState.released++;
        return true;
    }
    return false;
}

function checkGameOver(gameState) {
    if (gameState.released === MAX_LEMMINGS) {
        const activeLemmings = gameState.lemmings.filter(
            l => l.state !== 'dead' && l.state !== 'saved'
        ).length;

        if (activeLemmings === 0) {
            gameState.gameOver = true;
            if (gameState.saved >= Math.ceil(MAX_LEMMINGS * 0.5)) {
                gameState.message = `Victory! You saved ${gameState.saved} lemmings!`;
                return 'victory';
            } else {
                gameState.message = `Game Over! Only ${gameState.saved} lemmings saved.`;
                return 'defeat';
            }
        }
    }
    return 'playing';
}

function selectTool(gameState, tool) {
    const validTools = ['none', 'blocker', 'digger', 'builder', 'basher', 'umbrella'];
    if (validTools.includes(tool)) {
        gameState.selectedTool = tool;
        return true;
    }
    return false;
}

function useTool(gameState) {
    if (gameState.toolUses > 0 && gameState.selectedTool !== 'none') {
        gameState.toolUses--;
        return true;
    }
    return false;
}

// Tests
function runTests() {
    console.log('\n=== Game State Tests ===\n');
    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Initial state
        const state = createGameState();
        assertEqual(state.released, 0, 'Initial released count is 0');
        assertEqual(state.saved, 0, 'Initial saved count is 0');
        assertEqual(state.lost, 0, 'Initial lost count is 0');
        assertEqual(state.toolUses, 10, 'Initial tool uses is 10');
        assertFalse(state.gameOver, 'Game is not over initially');
        assertEqual(state.selectedTool, 'none', 'No tool selected initially');
        passed += 6;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 2: Entrance and exit positions
        const state = createGameState({ width: 1000, height: 800 });
        assertEqual(state.entrance.x, 80, 'Entrance x is correct');
        assertEqual(state.entrance.y, 50, 'Entrance y is correct');
        assertEqual(state.exit.x, 920, 'Exit x is canvas.width - 80');
        assertEqual(state.exit.y, 740, 'Exit y is canvas.height - 60');
        passed += 4;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 3: Spawn timing logic
        const state = createGameState();
        state.frameCount = 0;
        assertTrue(shouldSpawnLemming(state), 'Should spawn at frame 0');

        state.frameCount = 60;
        assertFalse(shouldSpawnLemming(state), 'Should not spawn at frame 60');

        state.frameCount = 120;
        assertTrue(shouldSpawnLemming(state), 'Should spawn at frame 120');

        state.frameCount = 240;
        assertTrue(shouldSpawnLemming(state), 'Should spawn at frame 240');
        passed += 4;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 4: Spawn lemming
        const state = createGameState();
        assertEqual(state.lemmings.length, 0, 'No lemmings initially');

        const spawned = spawnLemming(state);
        assertTrue(spawned, 'spawnLemming returns true');
        assertEqual(state.lemmings.length, 1, 'One lemming after spawn');
        assertEqual(state.released, 1, 'Released count incremented');
        passed += 4;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 5: Max lemmings limit
        const state = createGameState();

        for (let i = 0; i < MAX_LEMMINGS; i++) {
            spawnLemming(state);
        }
        assertEqual(state.released, MAX_LEMMINGS, 'Released equals MAX_LEMMINGS');

        const extraSpawn = spawnLemming(state);
        assertFalse(extraSpawn, 'Cannot spawn beyond MAX_LEMMINGS');
        assertEqual(state.released, MAX_LEMMINGS, 'Released stays at MAX_LEMMINGS');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 6: Tool selection
        const state = createGameState();

        assertTrue(selectTool(state, 'blocker'), 'Can select blocker');
        assertEqual(state.selectedTool, 'blocker', 'Tool is blocker');

        assertTrue(selectTool(state, 'digger'), 'Can select digger');
        assertEqual(state.selectedTool, 'digger', 'Tool is digger');

        assertTrue(selectTool(state, 'none'), 'Can deselect tool');
        assertEqual(state.selectedTool, 'none', 'Tool is none');

        assertFalse(selectTool(state, 'invalid'), 'Cannot select invalid tool');
        assertEqual(state.selectedTool, 'none', 'Tool stays none after invalid');
        passed += 8;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 7: Tool usage
        const state = createGameState();
        state.toolUses = 3;
        selectTool(state, 'digger');

        assertTrue(useTool(state), 'Can use tool with uses remaining');
        assertEqual(state.toolUses, 2, 'Tool uses decremented');

        useTool(state);
        useTool(state);
        assertEqual(state.toolUses, 0, 'Tool uses reaches 0');

        assertFalse(useTool(state), 'Cannot use tool with 0 uses');
        assertEqual(state.toolUses, 0, 'Tool uses stays at 0');
        passed += 5;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 8: Tool usage requires selection
        const state = createGameState();
        state.toolUses = 5;
        state.selectedTool = 'none';

        assertFalse(useTool(state), 'Cannot use tool when none selected');
        assertEqual(state.toolUses, 5, 'Tool uses unchanged');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 9: Victory condition
        const state = createGameState();
        state.released = MAX_LEMMINGS;
        state.saved = 8; // More than 50%

        // All lemmings are either saved or dead
        for (let i = 0; i < 8; i++) {
            state.lemmings.push(new MockLemming('saved'));
        }
        for (let i = 0; i < 7; i++) {
            state.lemmings.push(new MockLemming('dead'));
        }

        const result = checkGameOver(state);
        assertEqual(result, 'victory', 'Game ends in victory');
        assertTrue(state.gameOver, 'Game over flag is set');
        assertTrue(state.message.includes('Victory'), 'Victory message shown');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 10: Defeat condition
        const state = createGameState();
        state.released = MAX_LEMMINGS;
        state.saved = 5; // Less than 50%

        for (let i = 0; i < 5; i++) {
            state.lemmings.push(new MockLemming('saved'));
        }
        for (let i = 0; i < 10; i++) {
            state.lemmings.push(new MockLemming('dead'));
        }

        const result = checkGameOver(state);
        assertEqual(result, 'defeat', 'Game ends in defeat');
        assertTrue(state.gameOver, 'Game over flag is set');
        assertTrue(state.message.includes('Game Over'), 'Defeat message shown');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 11: Game still playing with active lemmings
        const state = createGameState();
        state.released = MAX_LEMMINGS;
        state.saved = 5;

        // Add some active lemmings still walking
        for (let i = 0; i < 5; i++) {
            state.lemmings.push(new MockLemming('walking'));
        }
        for (let i = 0; i < 5; i++) {
            state.lemmings.push(new MockLemming('saved'));
        }
        for (let i = 0; i < 5; i++) {
            state.lemmings.push(new MockLemming('dead'));
        }

        const result = checkGameOver(state);
        assertEqual(result, 'playing', 'Game still in progress');
        assertFalse(state.gameOver, 'Game over flag not set');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 12: Cannot spawn after game over
        const state = createGameState();
        state.gameOver = true;

        assertFalse(shouldSpawnLemming(state), 'Should not spawn after game over');
        const spawned = spawnLemming(state);
        assertFalse(spawned, 'spawnLemming returns false after game over');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    return { passed, failed };
}

// Run tests
runTests();
