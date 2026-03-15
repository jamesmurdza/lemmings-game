/**
 * Tests for Terrain Functions
 * Tests terrain initialization, modification, and platform generation
 */

// Constants
const TILE_SIZE = 14;

// Mock canvas
let mockCanvas = {
    width: 800,
    height: 600
};

// Terrain data
let terrainData = [];

// Initialize terrain (from game.js)
function initTerrain() {
    const cols = Math.ceil(mockCanvas.width / TILE_SIZE);
    const rows = Math.ceil(mockCanvas.height / TILE_SIZE);
    terrainData = [];

    for (let y = 0; y < rows; y++) {
        terrainData[y] = [];
        for (let x = 0; x < cols; x++) {
            terrainData[y][x] = 0;
        }
    }

    // Create main platform at bottom
    for (let x = 0; x < cols; x++) {
        for (let y = rows - 3; y < rows; y++) {
            terrainData[y][x] = 1;
        }
    }

    // Create starting platform (under entrance)
    const startPlatY = Math.floor(rows * 0.12);
    for (let x = 2; x < 18; x++) {
        if (startPlatY < rows) {
            terrainData[startPlatY][x] = 1;
            terrainData[startPlatY + 1][x] = 1;
        }
    }

    // Create middle platforms
    const plat1StartY = Math.floor(rows * 0.25);
    const plat1StartX = Math.floor(cols * 0.1);
    const plat1EndX = Math.floor(cols * 0.4);
    for (let x = plat1StartX; x < plat1EndX; x++) {
        let yPos = plat1StartY + Math.floor((x - plat1StartX) / 6);
        if (yPos < rows - 3 && yPos >= 0) {
            terrainData[yPos][x] = 1;
            terrainData[yPos + 1][x] = 1;
        }
    }

    // Platform 2
    const plat2Y = Math.floor(rows * 0.45);
    const plat2StartX = Math.floor(cols * 0.3);
    const plat2EndX = Math.floor(cols * 0.6);
    for (let x = plat2StartX; x < plat2EndX; x++) {
        if (plat2Y < rows) {
            terrainData[plat2Y][x] = 1;
            terrainData[plat2Y + 1][x] = 1;
        }
    }

    // Platform 3 with gap
    const plat3Y = Math.floor(rows * 0.6);
    const plat3StartX = Math.floor(cols * 0.5);
    const plat3EndX = Math.floor(cols * 0.8);
    const gapStart = Math.floor(cols * 0.62);
    const gapEnd = Math.floor(cols * 0.68);
    for (let x = plat3StartX; x < plat3EndX; x++) {
        if (x < gapStart || x > gapEnd) {
            if (plat3Y < rows) {
                terrainData[plat3Y][x] = 1;
                terrainData[plat3Y + 1][x] = 1;
            }
        }
    }

    // Platform 4
    const plat4Y = Math.floor(rows * 0.78);
    const plat4StartX = Math.floor(cols * 0.6);
    for (let x = plat4StartX; x < cols - 2; x++) {
        if (plat4Y < rows) {
            terrainData[plat4Y][x] = 1;
            terrainData[plat4Y + 1][x] = 1;
        }
    }

    // Wall
    const wallX = Math.floor(cols * 0.5);
    const wallStartY = Math.floor(rows * 0.4);
    const wallEndY = Math.floor(rows * 0.6);
    for (let y = wallStartY; y < wallEndY; y++) {
        if (y < rows && wallX < cols) {
            terrainData[y][wallX] = 1;
            terrainData[y][wallX + 1] = 1;
        }
    }
}

// Helper functions
function isSolidAt(tx, ty) {
    if (ty < 0 || ty >= terrainData.length || tx < 0 || tx >= terrainData[0].length) {
        return ty >= terrainData.length;
    }
    return terrainData[ty][tx] >= 1;
}

function removeTerrain(tx, ty) {
    if (ty >= 0 && ty < terrainData.length && tx >= 0 && tx < terrainData[0].length) {
        terrainData[ty][tx] = 0;
        return true;
    }
    return false;
}

function addTerrain(tx, ty, type = 2) {
    if (ty >= 0 && ty < terrainData.length && tx >= 0 && tx < terrainData[0].length) {
        if (terrainData[ty][tx] === 0) {
            terrainData[ty][tx] = type;
            return true;
        }
    }
    return false;
}

function countSolidTiles() {
    let count = 0;
    for (let y = 0; y < terrainData.length; y++) {
        for (let x = 0; x < terrainData[0].length; x++) {
            if (terrainData[y][x] >= 1) count++;
        }
    }
    return count;
}

function getTerrainDimensions() {
    return {
        rows: terrainData.length,
        cols: terrainData[0] ? terrainData[0].length : 0
    };
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

function assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
        throw new Error(`FAIL: ${message} - Expected > ${expected}, got ${actual}`);
    }
    console.log(`PASS: ${message}`);
}

// Tests
function runTests() {
    console.log('\n=== Terrain Tests ===\n');
    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Terrain initialization dimensions
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const dims = getTerrainDimensions();
        assertEqual(dims.cols, Math.ceil(800 / TILE_SIZE), 'Terrain has correct column count');
        assertEqual(dims.rows, Math.ceil(600 / TILE_SIZE), 'Terrain has correct row count');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 2: Bottom platform exists
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const cols = terrainData[0].length;

        // Check bottom 3 rows have terrain
        let bottomHasTerrain = true;
        for (let x = 0; x < cols; x++) {
            for (let y = rows - 3; y < rows; y++) {
                if (terrainData[y][x] !== 1) {
                    bottomHasTerrain = false;
                    break;
                }
            }
        }
        assertTrue(bottomHasTerrain, 'Bottom platform spans full width');
        passed++;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 3: Starting platform exists
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const startPlatY = Math.floor(rows * 0.12);

        // Check starting platform area
        let startPlatformExists = false;
        for (let x = 2; x < 18; x++) {
            if (terrainData[startPlatY][x] === 1) {
                startPlatformExists = true;
                break;
            }
        }
        assertTrue(startPlatformExists, 'Starting platform exists near entrance');
        passed++;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 4: Terrain has substantial content
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const solidCount = countSolidTiles();
        assertGreaterThan(solidCount, 100, 'Terrain has more than 100 solid tiles');
        passed++;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 5: isSolidAt function
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const cols = terrainData[0].length;

        // Bottom should be solid
        assertTrue(isSolidAt(cols / 2, rows - 1), 'Bottom center is solid');

        // Top corners should be empty
        assertFalse(isSolidAt(0, 0), 'Top-left corner is empty');
        assertFalse(isSolidAt(cols - 1, 0), 'Top-right corner is empty');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 6: Boundary checks
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;

        // Out of bounds checks
        assertFalse(isSolidAt(-1, 10), 'Negative x is not solid');
        assertFalse(isSolidAt(10, -1), 'Negative y is not solid');
        assertTrue(isSolidAt(10, rows + 10), 'Below bottom boundary is solid');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 7: Remove terrain
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const testX = 10;
        const testY = rows - 2;

        assertTrue(isSolidAt(testX, testY), 'Tile is solid before removal');
        const removed = removeTerrain(testX, testY);
        assertTrue(removed, 'removeTerrain returns true');
        assertFalse(isSolidAt(testX, testY), 'Tile is empty after removal');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 8: Add terrain
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        // Use coordinates that are guaranteed to be empty (top-right area)
        const testX = 50;
        const testY = 3;

        assertFalse(isSolidAt(testX, testY), 'Tile is empty before adding');
        const added = addTerrain(testX, testY, 2);
        assertTrue(added, 'addTerrain returns true');
        assertTrue(isSolidAt(testX, testY), 'Tile is solid after adding');
        assertEqual(terrainData[testY][testX], 2, 'Terrain type is stairs (2)');
        passed += 4;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 9: Cannot add terrain to occupied tile
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const testX = 10;
        const testY = rows - 1; // Bottom row is solid

        assertTrue(isSolidAt(testX, testY), 'Tile is already solid');
        const added = addTerrain(testX, testY, 2);
        assertFalse(added, 'Cannot add terrain to occupied tile');
        assertEqual(terrainData[testY][testX], 1, 'Original terrain type preserved');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 10: Remove terrain out of bounds
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const removed = removeTerrain(-1, 10);
        assertFalse(removed, 'Cannot remove terrain at negative x');

        const removed2 = removeTerrain(10, -1);
        assertFalse(removed2, 'Cannot remove terrain at negative y');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 11: Add terrain out of bounds
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const rows = terrainData.length;
        const cols = terrainData[0].length;

        const added = addTerrain(cols + 10, 10, 1);
        assertFalse(added, 'Cannot add terrain beyond right edge');

        const added2 = addTerrain(10, rows + 10, 1);
        assertFalse(added2, 'Cannot add terrain beyond bottom edge');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 12: Terrain types
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        // Type 1 = normal terrain, Type 2 = stairs
        // Use coordinates in top-right area guaranteed to be empty
        const emptyX = 52;
        const emptyY = 3;

        addTerrain(emptyX, emptyY, 1);
        assertEqual(terrainData[emptyY][emptyX], 1, 'Can add type 1 terrain');

        addTerrain(emptyX + 1, emptyY, 2);
        assertEqual(terrainData[emptyY][emptyX + 1], 2, 'Can add type 2 terrain (stairs)');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 13: Wall exists in middle
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const cols = terrainData[0].length;
        const rows = terrainData.length;
        const wallX = Math.floor(cols * 0.5);
        const wallY = Math.floor(rows * 0.5);

        assertTrue(isSolidAt(wallX, wallY), 'Wall exists in middle of map');
        passed++;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 14: Platform with gap
        mockCanvas = { width: 800, height: 600 };
        initTerrain();

        const cols = terrainData[0].length;
        const rows = terrainData.length;
        const plat3Y = Math.floor(rows * 0.6);
        const gapCenter = Math.floor(cols * 0.65);

        // Gap should be empty
        assertFalse(isSolidAt(gapCenter, plat3Y), 'Gap in platform 3 is empty');

        // Platform edges should be solid
        const beforeGap = Math.floor(cols * 0.55);
        const afterGap = Math.floor(cols * 0.72);
        assertTrue(isSolidAt(beforeGap, plat3Y), 'Platform before gap is solid');
        assertTrue(isSolidAt(afterGap, plat3Y), 'Platform after gap is solid');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 15: Different canvas sizes produce valid terrain
        mockCanvas = { width: 1920, height: 1080 };
        initTerrain();

        const dims = getTerrainDimensions();
        assertEqual(dims.cols, Math.ceil(1920 / TILE_SIZE), 'Large canvas has correct columns');
        assertEqual(dims.rows, Math.ceil(1080 / TILE_SIZE), 'Large canvas has correct rows');

        const solidCount = countSolidTiles();
        assertGreaterThan(solidCount, 100, 'Large canvas has substantial terrain');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    return { passed, failed };
}

// Run tests
runTests();
