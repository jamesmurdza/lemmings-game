/**
 * Tests for Lemming class
 * Tests core lemming behavior including movement, state transitions, and collision detection
 */

// Mock canvas and DOM environment
const mockCanvas = {
    width: 800,
    height: 600
};

// Mock terrain data
let terrainData = [];
const TILE_SIZE = 14;
const LEMMING_SIZE = 14;
const LEMMING_SPEED = 0.7;
const GRAVITY = 0.4;
const FALL_DEATH_HEIGHT = 160;

// Initialize empty terrain
function initEmptyTerrain() {
    const cols = Math.ceil(mockCanvas.width / TILE_SIZE);
    const rows = Math.ceil(mockCanvas.height / TILE_SIZE);
    terrainData = [];
    for (let y = 0; y < rows; y++) {
        terrainData[y] = [];
        for (let x = 0; x < cols; x++) {
            terrainData[y][x] = 0;
        }
    }
}

// Lemming class (extracted for testing)
class Lemming {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = LEMMING_SPEED;
        this.vy = 0;
        this.state = 'falling';
        this.direction = 1;
        this.fallDistance = 0;
        this.hasUmbrella = false;
        this.actionTimer = 0;
        this.builderSteps = 0;
    }

    getTileX() {
        return Math.floor(this.x / TILE_SIZE);
    }

    getTileY() {
        return Math.floor(this.y / TILE_SIZE);
    }

    isSolidAt(tx, ty) {
        if (ty < 0 || ty >= terrainData.length || tx < 0 || tx >= terrainData[0].length) {
            return ty >= terrainData.length;
        }
        return terrainData[ty][tx] >= 1;
    }

    removeTerrain(tx, ty) {
        if (ty >= 0 && ty < terrainData.length && tx >= 0 && tx < terrainData[0].length) {
            terrainData[ty][tx] = 0;
        }
    }

    addTerrain(tx, ty, type = 2) {
        if (ty >= 0 && ty < terrainData.length && tx >= 0 && tx < terrainData[0].length) {
            if (terrainData[ty][tx] === 0) {
                terrainData[ty][tx] = type;
                return true;
            }
        }
        return false;
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - (this.y - 7);
        return dx * dx + dy * dy < 200;
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

// Tests
function runTests() {
    console.log('\n=== Lemming Class Tests ===\n');
    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Lemming constructor
        initEmptyTerrain();
        const lemming = new Lemming(100, 200);
        assertEqual(lemming.x, 100, 'Constructor sets x position');
        assertEqual(lemming.y, 200, 'Constructor sets y position');
        assertEqual(lemming.state, 'falling', 'New lemming starts in falling state');
        assertEqual(lemming.direction, 1, 'New lemming faces right');
        assertEqual(lemming.hasUmbrella, false, 'New lemming has no umbrella');
        passed += 5;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 2: Tile position calculation
        initEmptyTerrain();
        const lemming = new Lemming(28, 42);
        assertEqual(lemming.getTileX(), 2, 'getTileX calculates correct tile');
        assertEqual(lemming.getTileY(), 3, 'getTileY calculates correct tile');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 3: Collision detection with point
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);
        assertTrue(lemming.containsPoint(100, 93), 'Point at center is contained');
        assertTrue(lemming.containsPoint(105, 95), 'Point near center is contained');
        assertFalse(lemming.containsPoint(200, 200), 'Distant point is not contained');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 4: Terrain detection
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        // Set a solid tile
        terrainData[10][10] = 1;

        assertTrue(lemming.isSolidAt(10, 10), 'Detects solid terrain');
        assertFalse(lemming.isSolidAt(5, 5), 'Detects empty terrain');
        assertTrue(lemming.isSolidAt(0, terrainData.length + 1), 'Bottom boundary is solid');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 5: Terrain modification - remove
        initEmptyTerrain();
        terrainData[10][10] = 1;
        const lemming = new Lemming(100, 100);

        assertTrue(lemming.isSolidAt(10, 10), 'Terrain exists before removal');
        lemming.removeTerrain(10, 10);
        assertFalse(lemming.isSolidAt(10, 10), 'Terrain removed successfully');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 6: Terrain modification - add
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        assertFalse(lemming.isSolidAt(15, 15), 'No terrain before adding');
        const added = lemming.addTerrain(15, 15, 2);
        assertTrue(added, 'addTerrain returns true on success');
        assertTrue(lemming.isSolidAt(15, 15), 'Terrain added successfully');

        // Try to add terrain where it already exists
        const addedAgain = lemming.addTerrain(15, 15, 2);
        assertFalse(addedAgain, 'Cannot add terrain to occupied tile');
        passed += 4;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 7: Umbrella state
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        assertFalse(lemming.hasUmbrella, 'Lemming starts without umbrella');
        lemming.hasUmbrella = true;
        assertTrue(lemming.hasUmbrella, 'Umbrella can be assigned');
        passed += 2;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 8: Direction change
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        assertEqual(lemming.direction, 1, 'Starts facing right');
        lemming.direction *= -1;
        assertEqual(lemming.direction, -1, 'Can face left');
        lemming.direction *= -1;
        assertEqual(lemming.direction, 1, 'Can turn around again');
        passed += 3;
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 9: State assignments
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        const states = ['walking', 'falling', 'blocker', 'digger', 'builder', 'basher', 'dead', 'saved'];
        for (const state of states) {
            lemming.state = state;
            assertEqual(lemming.state, state, `Can set state to ${state}`);
            passed++;
        }
    } catch (e) {
        console.error(e.message);
        failed++;
    }

    try {
        // Test 10: Out of bounds terrain check
        initEmptyTerrain();
        const lemming = new Lemming(100, 100);

        assertFalse(lemming.isSolidAt(-1, 10), 'Left boundary is not solid');
        assertFalse(lemming.isSolidAt(10, -1), 'Top boundary is not solid');
        assertFalse(lemming.isSolidAt(1000, 10), 'Right boundary is not solid');
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
