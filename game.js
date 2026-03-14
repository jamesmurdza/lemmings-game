// Lemmings JS - A simple MVP implementation

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Set canvas size to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Update exit position based on new canvas size
    if (gameState) {
        gameState.exit.x = canvas.width - 80;
        gameState.exit.y = canvas.height - 60;
    }

    // Reinitialize terrain if game is already running
    if (terrainData.length > 0) {
        initTerrain();
    }
}

// Game constants
const GRAVITY = 0.4;
const LEMMING_SPEED = 0.7;
const LEMMING_SIZE = 14;
const TILE_SIZE = 14;
const SPAWN_INTERVAL = 120; // frames between spawns (slower spawning)
const MAX_LEMMINGS = 15;
const FALL_DEATH_HEIGHT = 160; // more forgiving fall distance

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
    entrance: { x: 80, y: 50 },
    exit: { x: window.innerWidth - 80, y: window.innerHeight - 60 },
    message: ''
};

// Drag state for mouse dragging lemmings
let dragState = {
    isDragging: false,
    draggedLemming: null,
    offsetX: 0,
    offsetY: 0,
    previousState: null  // Store the lemming's state before dragging
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
    const startPlatY = Math.floor(rows * 0.12);
    for (let x = 2; x < 18; x++) {
        if (startPlatY < rows) {
            terrainData[startPlatY][x] = 1;
            terrainData[startPlatY + 1][x] = 1;
        }
    }

    // Create middle platforms - scaled to canvas size
    // Platform 1 - slopes down from left
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

    // Platform 2 - middle section
    const plat2Y = Math.floor(rows * 0.45);
    const plat2StartX = Math.floor(cols * 0.3);
    const plat2EndX = Math.floor(cols * 0.6);
    for (let x = plat2StartX; x < plat2EndX; x++) {
        if (plat2Y < rows) {
            terrainData[plat2Y][x] = 1;
            terrainData[plat2Y + 1][x] = 1;
        }
    }

    // Platform 3 - right section with gap
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

    // Platform 4 - lower right leading to exit
    const plat4Y = Math.floor(rows * 0.78);
    const plat4StartX = Math.floor(cols * 0.6);
    for (let x = plat4StartX; x < cols - 2; x++) {
        if (plat4Y < rows) {
            terrainData[plat4Y][x] = 1;
            terrainData[plat4Y + 1][x] = 1;
        }
    }

    // Add some obstacles/walls
    // Wall blocking direct path
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
    ctx.fillRect(gameState.entrance.x - 21, gameState.entrance.y - 28, 42, 28);
    ctx.fillStyle = '#6666ff';
    ctx.fillRect(gameState.entrance.x - 7, gameState.entrance.y - 7, 14, 14);

    // Exit
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    ctx.moveTo(gameState.exit.x, gameState.exit.y - 42);
    ctx.lineTo(gameState.exit.x - 28, gameState.exit.y);
    ctx.lineTo(gameState.exit.x + 28, gameState.exit.y);
    ctx.closePath();
    ctx.fill();

    // Exit door
    ctx.fillStyle = '#00aa55';
    ctx.fillRect(gameState.exit.x - 11, gameState.exit.y - 28, 22, 28);
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
        if (this.state === 'dead' || this.state === 'saved' || this.state === 'dragging') return;

        const tileX = this.getTileX();
        const tileY = this.getTileY();
        const belowY = tileY + 1;

        // Check for exit
        const dx = this.x - gameState.exit.x;
        const dy = this.y - gameState.exit.y;
        if (Math.abs(dx) < 21 && Math.abs(dy) < 35) {
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
            case 'dragging':
                color = '#ff00ff'; // Magenta for dragging
                break;
        }

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 7, LEMMING_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 17, 6, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.direction * 3, this.y - 17, 2, 0, Math.PI * 2);
        ctx.fill();

        // Umbrella indicator
        if (this.hasUmbrella) {
            ctx.strokeStyle = COLORS.umbrella;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 28, 11, Math.PI, 0);
            ctx.stroke();
        }

        // State indicator for special states
        if (this.state === 'blocker') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x - 7, this.y - 25);
            ctx.lineTo(this.x + 7, this.y - 25);
            ctx.stroke();
        }

        // Dragging indicator - draw a glowing ring
        if (this.state === 'dragging') {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 5, LEMMING_SIZE / 2 + 4, 0, Math.PI * 2);
            ctx.stroke();
            // Draw grab hand indicator lines
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(this.x, this.y - 5, LEMMING_SIZE / 2 + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - (this.y - 7);
        return dx * dx + dy * dy < 200;
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

// Helper function to get mouse position relative to canvas
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// Handle mouse down - start dragging
canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);

    // Find a lemming under the mouse cursor
    for (const lemming of gameState.lemmings) {
        if (lemming.containsPoint(pos.x, pos.y) &&
            lemming.state !== 'dead' &&
            lemming.state !== 'saved') {

            // Start dragging this lemming
            dragState.isDragging = true;
            dragState.draggedLemming = lemming;
            dragState.offsetX = lemming.x - pos.x;
            dragState.offsetY = lemming.y - pos.y;
            dragState.previousState = lemming.state;

            // Set lemming to dragging state
            lemming.state = 'dragging';
            lemming.vy = 0; // Reset velocity

            // Change cursor to grabbing
            canvas.style.cursor = 'grabbing';

            // Prevent the click event from firing
            e.preventDefault();
            break;
        }
    }
});

// Handle mouse move - update dragged lemming position
canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);

    if (dragState.isDragging && dragState.draggedLemming) {
        // Update lemming position to follow mouse
        dragState.draggedLemming.x = pos.x + dragState.offsetX;
        dragState.draggedLemming.y = pos.y + dragState.offsetY;

        // Keep lemming within canvas bounds
        dragState.draggedLemming.x = Math.max(10, Math.min(canvas.width - 10, dragState.draggedLemming.x));
        dragState.draggedLemming.y = Math.max(10, Math.min(canvas.height - 10, dragState.draggedLemming.y));
    } else {
        // Update cursor when hovering over a lemming
        let hoveringLemming = false;
        for (const lemming of gameState.lemmings) {
            if (lemming.containsPoint(pos.x, pos.y) &&
                lemming.state !== 'dead' &&
                lemming.state !== 'saved') {
                hoveringLemming = true;
                break;
            }
        }
        canvas.style.cursor = hoveringLemming ? 'grab' : 'default';
    }
});

// Handle mouse up - release dragged lemming
canvas.addEventListener('mouseup', (e) => {
    if (dragState.isDragging && dragState.draggedLemming) {
        const lemming = dragState.draggedLemming;

        // Check if lemming is on solid ground
        const tileX = lemming.getTileX();
        const tileY = lemming.getTileY();
        const belowY = tileY + 1;

        if (lemming.isSolidAt(tileX, belowY)) {
            // On ground, restore previous state or set to walking
            if (dragState.previousState === 'blocker' ||
                dragState.previousState === 'digger' ||
                dragState.previousState === 'builder' ||
                dragState.previousState === 'basher') {
                lemming.state = dragState.previousState;
            } else {
                lemming.state = 'walking';
            }
            // Snap to ground
            lemming.y = Math.floor(lemming.y / TILE_SIZE) * TILE_SIZE;
        } else {
            // In the air, start falling
            lemming.state = 'falling';
            lemming.fallDistance = 0;
            lemming.vy = 0;
        }

        // Reset drag state
        dragState.isDragging = false;
        dragState.draggedLemming = null;
        dragState.previousState = null;

        canvas.style.cursor = 'default';
    }
});

// Handle mouse leaving canvas - release dragged lemming
canvas.addEventListener('mouseleave', (e) => {
    if (dragState.isDragging && dragState.draggedLemming) {
        const lemming = dragState.draggedLemming;

        // Start falling when released
        lemming.state = 'falling';
        lemming.fallDistance = 0;
        lemming.vy = 0;

        // Reset drag state
        dragState.isDragging = false;
        dragState.draggedLemming = null;
        dragState.previousState = null;

        canvas.style.cursor = 'default';
    }
});

// Handle clicks on canvas (for tool application)
canvas.addEventListener('click', (e) => {
    // Don't process click if we just finished dragging
    if (dragState.isDragging) return;

    const pos = getMousePos(e);

    if (gameState.selectedTool === 'none' || gameState.toolUses <= 0) return;

    // Find clicked lemming
    for (const lemming of gameState.lemmings) {
        if (lemming.containsPoint(pos.x, pos.y) && lemming.state !== 'dead' && lemming.state !== 'saved') {
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
        entrance: { x: 80, y: 50 },
        exit: { x: canvas.width - 80, y: canvas.height - 60 },
        message: ''
    };
    // Reset drag state
    dragState = {
        isDragging: false,
        draggedLemming: null,
        offsetX: 0,
        offsetY: 0,
        previousState: null
    };
    initTerrain();
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
}

// Initialize and start
resizeCanvas();
initTerrain();
gameLoop();

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    resetGame();
});
