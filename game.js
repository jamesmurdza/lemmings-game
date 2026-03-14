// Lemmings JS - A simple MVP implementation

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.3;
const LEMMING_SPEED = 0.5;
const LEMMING_SIZE = 10;
const TILE_SIZE = 10;
const SPAWN_INTERVAL = 120; // frames between spawns (slower spawning)
const MAX_LEMMINGS = 15;
const FALL_DEATH_HEIGHT = 120; // more forgiving fall distance

// Colors
const COLORS = {
    background: '#1a1a2e',
    terrain: '#8B4513',
    terrainHighlight: '#A0522D',
    entrance: '#4444ff',
    exit: '#00ff88',
    lemming: '#00ccff',
    lemmingWalking: '#00ffff',
    blocker: '#ff4444',
    digger: '#ffaa00',
    builder: '#44ff44',
    basher: '#ff44ff',
    umbrella: '#ffffff',
    stairs: '#DAA520'
};

// Game state
let gameState = {
    lemmings: [],
    terrain: [],
    selectedTool: 'none',
    released: 0,
    saved: 0,
    lost: 0,
    toolUses: 10,
    frameCount: 0,
    gameOver: false,
    entrance: { x: 50, y: 30 },
    exit: { x: 720, y: 440 },
    message: ''
};

// Terrain data (1 = solid, 0 = empty)
let terrainData = [];

// Initialize terrain
function initTerrain() {
    const cols = Math.ceil(canvas.width / TILE_SIZE);
    const rows = Math.ceil(canvas.height / TILE_SIZE);
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
    for (let x = 2; x < 15; x++) {
        terrainData[8][x] = 1;
        terrainData[9][x] = 1;
    }

    // Create middle platforms
    // Platform 1 - slopes down from left
    for (let x = 10; x < 35; x++) {
        let yPos = 18 + Math.floor((x - 10) / 5);
        if (yPos < rows - 3) {
            terrainData[yPos][x] = 1;
            terrainData[yPos + 1][x] = 1;
        }
    }

    // Platform 2 - middle section
    for (let x = 30; x < 55; x++) {
        terrainData[28][x] = 1;
        terrainData[29][x] = 1;
    }

    // Platform 3 - right section with gap
    for (let x = 50; x < 70; x++) {
        if (x < 58 || x > 62) { // gap in middle
            terrainData[35][x] = 1;
            terrainData[36][x] = 1;
        }
    }

    // Platform 4 - lower right leading to exit
    for (let x = 60; x < cols - 2; x++) {
        terrainData[42][x] = 1;
        terrainData[43][x] = 1;
    }

    // Add some obstacles/walls
    // Wall blocking direct path
    for (let y = 25; y < 35; y++) {
        terrainData[y][45] = 1;
        terrainData[y][46] = 1;
    }
}

// Draw terrain
function drawTerrain() {
    const cols = terrainData[0].length;
    const rows = terrainData.length;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (terrainData[y][x] === 1) {
                ctx.fillStyle = COLORS.terrain;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // Highlight
                ctx.fillStyle = COLORS.terrainHighlight;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 2);
            } else if (terrainData[y][x] === 2) {
                // Stairs
                ctx.fillStyle = COLORS.stairs;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// Draw entrance and exit
function drawEntranceExit() {
    // Entrance
    ctx.fillStyle = COLORS.entrance;
    ctx.fillRect(gameState.entrance.x - 15, gameState.entrance.y - 20, 30, 20);
    ctx.fillStyle = '#6666ff';
    ctx.fillRect(gameState.entrance.x - 5, gameState.entrance.y - 5, 10, 10);

    // Exit
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    ctx.moveTo(gameState.exit.x, gameState.exit.y - 30);
    ctx.lineTo(gameState.exit.x - 20, gameState.exit.y);
    ctx.lineTo(gameState.exit.x + 20, gameState.exit.y);
    ctx.closePath();
    ctx.fill();

    // Exit door
    ctx.fillStyle = '#00aa55';
    ctx.fillRect(gameState.exit.x - 8, gameState.exit.y - 20, 16, 20);
}

// Lemming class
class Lemming {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = LEMMING_SPEED;
        this.vy = 0;
        this.state = 'falling'; // walking, falling, blocker, digger, builder, basher, dead, saved
        this.direction = 1; // 1 = right, -1 = left
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
            return ty >= terrainData.length; // Bottom is solid
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

    update() {
        if (this.state === 'dead' || this.state === 'saved') return;

        const tileX = this.getTileX();
        const tileY = this.getTileY();
        const belowY = tileY + 1;

        // Check for exit
        const dx = this.x - gameState.exit.x;
        const dy = this.y - gameState.exit.y;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 25) {
            this.state = 'saved';
            gameState.saved++;
            return;
        }

        // Handle different states
        switch (this.state) {
            case 'blocker':
                // Blockers don't move
                break;

            case 'digger':
                this.actionTimer++;
                if (this.actionTimer >= 15) {
                    this.actionTimer = 0;
                    // Dig down
                    if (this.isSolidAt(tileX, belowY)) {
                        this.removeTerrain(tileX, belowY);
                        this.y += TILE_SIZE;
                    } else {
                        // Nothing to dig, become walker
                        this.state = 'walking';
                    }
                }
                break;

            case 'builder':
                this.actionTimer++;
                if (this.actionTimer >= 20) {
                    this.actionTimer = 0;
                    // Build stairs
                    const buildX = tileX + this.direction;
                    const buildY = tileY;

                    if (this.builderSteps < 6 && this.addTerrain(buildX, buildY, 2)) {
                        this.x += this.direction * TILE_SIZE;
                        this.y -= TILE_SIZE / 2;
                        this.builderSteps++;
                    } else {
                        // Can't build more, become walker
                        this.state = 'walking';
                        this.direction *= -1;
                    }
                }
                break;

            case 'basher':
                this.actionTimer++;
                if (this.actionTimer >= 10) {
                    this.actionTimer = 0;
                    // Bash horizontally
                    const bashX = tileX + this.direction;
                    if (this.isSolidAt(bashX, tileY)) {
                        this.removeTerrain(bashX, tileY);
                        if (this.isSolidAt(bashX, tileY - 1)) {
                            this.removeTerrain(bashX, tileY - 1);
                        }
                    } else {
                        // Nothing to bash, become walker
                        this.state = 'walking';
                    }
                }
                // Still move forward slowly
                this.x += this.direction * 0.3;
                break;

            case 'falling':
                this.vy += GRAVITY;
                if (this.hasUmbrella && this.vy > 1) {
                    this.vy = 1; // Slow fall with umbrella
                }
                this.y += this.vy;
                this.fallDistance += this.vy;

                // Check for landing
                if (this.isSolidAt(tileX, Math.floor(this.y / TILE_SIZE) + 1)) {
                    // Landed
                    this.y = Math.floor(this.y / TILE_SIZE) * TILE_SIZE;

                    // Check fall death
                    if (this.fallDistance > FALL_DEATH_HEIGHT && !this.hasUmbrella) {
                        this.state = 'dead';
                        gameState.lost++;
                    } else {
                        this.state = 'walking';
                        this.vy = 0;
                        this.fallDistance = 0;
                    }
                }

                // Check for out of bounds
                if (this.y > canvas.height + 50) {
                    this.state = 'dead';
                    gameState.lost++;
                }
                break;

            case 'walking':
            default:
                // Check if there's ground below
                if (!this.isSolidAt(tileX, belowY)) {
                    this.state = 'falling';
                    this.fallDistance = 0;
                    break;
                }

                // Move horizontally
                const nextX = this.x + this.direction * LEMMING_SPEED;
                const nextTileX = Math.floor(nextX / TILE_SIZE);

                // Check for wall
                if (this.isSolidAt(nextTileX, tileY)) {
                    // Try to climb one tile
                    if (!this.isSolidAt(nextTileX, tileY - 1)) {
                        this.x = nextX;
                        this.y -= TILE_SIZE;
                    } else {
                        // Wall too high, turn around
                        this.direction *= -1;
                    }
                } else {
                    this.x = nextX;
                }

                // Check for blockers
                for (const other of gameState.lemmings) {
                    if (other !== this && other.state === 'blocker') {
                        const dist = Math.abs(this.x - other.x);
                        if (dist < LEMMING_SIZE && Math.abs(this.y - other.y) < LEMMING_SIZE) {
                            this.direction *= -1;
                        }
                    }
                }

                // Boundary check
                if (this.x < 10 || this.x > canvas.width - 10) {
                    this.direction *= -1;
                }
                break;
        }
    }

    draw() {
        if (this.state === 'dead' || this.state === 'saved') return;

        let color = COLORS.lemming;

        switch (this.state) {
            case 'blocker':
                color = COLORS.blocker;
                break;
            case 'digger':
                color = COLORS.digger;
                break;
            case 'builder':
                color = COLORS.builder;
                break;
            case 'basher':
                color = COLORS.basher;
                break;
            case 'walking':
                color = COLORS.lemmingWalking;
                break;
        }

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 5, LEMMING_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.direction * 2, this.y - 12, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Umbrella indicator
        if (this.hasUmbrella) {
            ctx.strokeStyle = COLORS.umbrella;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 20, 8, Math.PI, 0);
            ctx.stroke();
        }

        // State indicator for special states
        if (this.state === 'blocker') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x - 5, this.y - 18);
            ctx.lineTo(this.x + 5, this.y - 18);
            ctx.stroke();
        }
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - (this.y - 5);
        return dx * dx + dy * dy < 100;
    }
}

// Spawn lemming
function spawnLemming() {
    if (gameState.released < MAX_LEMMINGS && !gameState.gameOver) {
        const lemming = new Lemming(
            gameState.entrance.x,
            gameState.entrance.y + 10
        );
        gameState.lemmings.push(lemming);
        gameState.released++;
    }
}

// Update game state
function update() {
    gameState.frameCount++;

    // Spawn lemmings
    if (gameState.frameCount % SPAWN_INTERVAL === 0) {
        spawnLemming();
    }

    // Update all lemmings
    for (const lemming of gameState.lemmings) {
        lemming.update();
    }

    // Check game over
    if (gameState.released === MAX_LEMMINGS) {
        const activeLemmings = gameState.lemmings.filter(
            l => l.state !== 'dead' && l.state !== 'saved'
        ).length;

        if (activeLemmings === 0) {
            gameState.gameOver = true;
            if (gameState.saved >= Math.ceil(MAX_LEMMINGS * 0.5)) {
                gameState.message = `Victory! You saved ${gameState.saved} lemmings!`;
            } else {
                gameState.message = `Game Over! Only ${gameState.saved} lemmings saved. Need at least ${Math.ceil(MAX_LEMMINGS * 0.5)}.`;
            }
        }
    }

    // Update UI
    document.getElementById('released').textContent = gameState.released;
    document.getElementById('saved').textContent = gameState.saved;
    document.getElementById('lost').textContent = gameState.lost;
    document.getElementById('tool-uses').textContent = gameState.toolUses;
    document.getElementById('message').textContent = gameState.message;
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    drawTerrain();

    // Draw entrance and exit
    drawEntranceExit();

    // Draw lemmings
    for (const lemming of gameState.lemmings) {
        lemming.draw();
    }

    // Draw selected tool indicator
    if (gameState.selectedTool !== 'none') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px Arial';
        ctx.fillText(`Tool: ${gameState.selectedTool.toUpperCase()}`, 10, 20);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Handle clicks on canvas
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameState.selectedTool === 'none' || gameState.toolUses <= 0) return;

    // Find clicked lemming
    for (const lemming of gameState.lemmings) {
        if (lemming.containsPoint(x, y) && lemming.state !== 'dead' && lemming.state !== 'saved') {
            // Apply tool
            if (lemming.state === 'walking' || lemming.state === 'falling') {
                switch (gameState.selectedTool) {
                    case 'blocker':
                        if (lemming.state === 'walking') {
                            lemming.state = 'blocker';
                            gameState.toolUses--;
                        }
                        break;
                    case 'digger':
                        if (lemming.state === 'walking') {
                            lemming.state = 'digger';
                            lemming.actionTimer = 0;
                            gameState.toolUses--;
                        }
                        break;
                    case 'builder':
                        if (lemming.state === 'walking') {
                            lemming.state = 'builder';
                            lemming.actionTimer = 0;
                            lemming.builderSteps = 0;
                            gameState.toolUses--;
                        }
                        break;
                    case 'basher':
                        if (lemming.state === 'walking') {
                            lemming.state = 'basher';
                            lemming.actionTimer = 0;
                            gameState.toolUses--;
                        }
                        break;
                    case 'umbrella':
                        if (!lemming.hasUmbrella) {
                            lemming.hasUmbrella = true;
                            gameState.toolUses--;
                        }
                        break;
                }
            }
            break;
        }
    }
});

// Handle tool selection
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.selectedTool = btn.dataset.tool;
    });
});

// Restart button
document.getElementById('restart-btn').addEventListener('click', () => {
    resetGame();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 's':
            selectTool('none');
            break;
        case 'b':
            selectTool('blocker');
            break;
        case 'd':
            selectTool('digger');
            break;
        case 'u':
            selectTool('builder');
            break;
        case 'a':
            selectTool('basher');
            break;
        case 'm':
            selectTool('umbrella');
            break;
        case 'r':
            resetGame();
            break;
    }
});

function selectTool(tool) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        }
    });
    gameState.selectedTool = tool;
}

function resetGame() {
    gameState = {
        lemmings: [],
        terrain: [],
        selectedTool: 'none',
        released: 0,
        saved: 0,
        lost: 0,
        toolUses: 15,
        frameCount: 0,
        gameOver: false,
        entrance: { x: 50, y: 30 },
        exit: { x: 720, y: 440 },
        message: ''
    };
    initTerrain();
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
}

// Initialize and start
initTerrain();
gameLoop();
