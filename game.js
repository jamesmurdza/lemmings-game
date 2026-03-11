// Lemmings JS - A simple MVP implementation

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ==================== SOUND MANAGER ====================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.masterVolume = 0.3;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
    }

    // Create oscillator-based sound
    playTone(frequency, duration, type = 'sine', volume = 1, ramp = true) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const vol = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);

        if (ramp) {
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        }

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Play frequency sweep
    playSweep(startFreq, endFreq, duration, type = 'sine', volume = 1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

        const vol = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Play noise burst (for impact sounds)
    playNoise(duration, volume = 1) {
        if (!this.enabled || !this.audioContext) return;

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const vol = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        noise.start();
        noise.stop(this.audioContext.currentTime + duration);
    }

    // === GAME SOUND EFFECTS ===

    // Lemming spawns from entrance
    spawn() {
        this.playTone(880, 0.1, 'sine', 0.4);
        setTimeout(() => this.playTone(1100, 0.1, 'sine', 0.3), 50);
    }

    // Lemming lands after falling
    land() {
        this.playNoise(0.08, 0.3);
        this.playTone(150, 0.1, 'sine', 0.2);
    }

    // Lemming falls to death
    death() {
        this.playSweep(400, 100, 0.3, 'sawtooth', 0.4);
        setTimeout(() => this.playNoise(0.15, 0.3), 100);
    }

    // Lemming reaches exit - saved!
    saved() {
        this.playTone(523, 0.1, 'sine', 0.4); // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.4), 100); // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.4), 200); // G5
    }

    // Tool button clicked
    buttonClick() {
        this.playTone(600, 0.05, 'square', 0.2);
    }

    // Tool applied to lemming
    toolApply() {
        this.playTone(440, 0.08, 'sine', 0.3);
        setTimeout(() => this.playTone(660, 0.1, 'sine', 0.3), 60);
    }

    // Digger digging
    dig() {
        this.playNoise(0.06, 0.2);
        this.playTone(100 + Math.random() * 50, 0.08, 'triangle', 0.2);
    }

    // Builder building
    build() {
        this.playTone(300, 0.05, 'square', 0.2);
        this.playTone(450, 0.08, 'square', 0.15);
    }

    // Basher bashing
    bash() {
        this.playNoise(0.1, 0.3);
        this.playTone(80, 0.12, 'sawtooth', 0.25);
    }

    // Umbrella deployed
    umbrella() {
        this.playSweep(300, 800, 0.2, 'sine', 0.3);
    }

    // Blocker assigned
    blocker() {
        this.playTone(200, 0.1, 'square', 0.3);
        this.playTone(250, 0.15, 'square', 0.25);
    }

    // Lemming turns around (hitting blocker or wall)
    turn() {
        this.playTone(300, 0.04, 'triangle', 0.15);
    }

    // Falling sound (called periodically while falling)
    falling() {
        this.playSweep(400, 200, 0.15, 'sine', 0.15);
    }

    // Victory fanfare
    victory() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.25, 'sine', 0.4);
                this.playTone(freq * 0.5, 0.25, 'sine', 0.2); // harmony
            }, i * 150);
        });
        setTimeout(() => {
            this.playTone(1047, 0.5, 'sine', 0.5);
            this.playTone(523, 0.5, 'sine', 0.3);
        }, 600);
    }

    // Game over sound
    gameOver() {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sawtooth', 0.3);
            }, i * 200);
        });
    }

    // Game start/restart
    gameStart() {
        this.playTone(440, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(550, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(660, 0.15, 'sine', 0.4), 200);
    }
}

// Create global sound manager
const soundManager = new SoundManager();

// Game constants
const GRAVITY = 0.5;
const LEMMING_SPEED = 1;
const LEMMING_SIZE = 10;
const TILE_SIZE = 10;
const SPAWN_INTERVAL = 60; // frames between spawns
const MAX_LEMMINGS = 15;
const FALL_DEATH_HEIGHT = 80;

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
            soundManager.saved();
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
                        soundManager.dig();
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
                        soundManager.build();
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
                        soundManager.bash();
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

                // Play falling sound occasionally
                if (this.fallDistance > 20 && Math.floor(this.fallDistance) % 40 === 0) {
                    soundManager.falling();
                }

                // Check for landing
                if (this.isSolidAt(tileX, Math.floor(this.y / TILE_SIZE) + 1)) {
                    // Landed
                    this.y = Math.floor(this.y / TILE_SIZE) * TILE_SIZE;

                    // Check fall death
                    if (this.fallDistance > FALL_DEATH_HEIGHT && !this.hasUmbrella) {
                        this.state = 'dead';
                        gameState.lost++;
                        soundManager.death();
                    } else {
                        this.state = 'walking';
                        this.vy = 0;
                        if (this.fallDistance > 10) {
                            soundManager.land();
                        }
                        this.fallDistance = 0;
                    }
                }

                // Check for out of bounds
                if (this.y > canvas.height + 50) {
                    this.state = 'dead';
                    gameState.lost++;
                    soundManager.death();
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
                            soundManager.turn();
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
        soundManager.spawn();
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

        if (activeLemmings === 0 && !gameState.gameOver) {
            gameState.gameOver = true;
            if (gameState.saved >= Math.ceil(MAX_LEMMINGS * 0.6)) {
                gameState.message = `Victory! You saved ${gameState.saved} lemmings!`;
                soundManager.victory();
            } else {
                gameState.message = `Game Over! Only ${gameState.saved} lemmings saved. Need at least ${Math.ceil(MAX_LEMMINGS * 0.6)}.`;
                soundManager.gameOver();
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
                            soundManager.blocker();
                        }
                        break;
                    case 'digger':
                        if (lemming.state === 'walking') {
                            lemming.state = 'digger';
                            lemming.actionTimer = 0;
                            gameState.toolUses--;
                            soundManager.toolApply();
                        }
                        break;
                    case 'builder':
                        if (lemming.state === 'walking') {
                            lemming.state = 'builder';
                            lemming.actionTimer = 0;
                            lemming.builderSteps = 0;
                            gameState.toolUses--;
                            soundManager.toolApply();
                        }
                        break;
                    case 'basher':
                        if (lemming.state === 'walking') {
                            lemming.state = 'basher';
                            lemming.actionTimer = 0;
                            gameState.toolUses--;
                            soundManager.toolApply();
                        }
                        break;
                    case 'umbrella':
                        if (!lemming.hasUmbrella) {
                            lemming.hasUmbrella = true;
                            gameState.toolUses--;
                            soundManager.umbrella();
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
        soundManager.init(); // Initialize audio on first user interaction
        soundManager.buttonClick();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.selectedTool = btn.dataset.tool;
    });
});

// Restart button
document.getElementById('restart-btn').addEventListener('click', () => {
    soundManager.init(); // Initialize audio on first user interaction
    soundManager.buttonClick();
    resetGame();
});

// Sound toggle button
document.getElementById('sound-btn').addEventListener('click', () => {
    soundManager.init(); // Initialize audio on first user interaction
    const isEnabled = soundManager.toggle();
    document.getElementById('sound-btn').textContent = `Sound: ${isEnabled ? 'ON' : 'OFF'}`;
    if (isEnabled) {
        soundManager.buttonClick();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    soundManager.init(); // Initialize audio on first user interaction
    switch (e.key.toLowerCase()) {
        case 's':
            selectTool('none');
            soundManager.buttonClick();
            break;
        case 'b':
            selectTool('blocker');
            soundManager.buttonClick();
            break;
        case 'd':
            selectTool('digger');
            soundManager.buttonClick();
            break;
        case 'u':
            selectTool('builder');
            soundManager.buttonClick();
            break;
        case 'a':
            selectTool('basher');
            soundManager.buttonClick();
            break;
        case 'm':
            selectTool('umbrella');
            soundManager.buttonClick();
            break;
        case 'r':
            soundManager.buttonClick();
            resetGame();
            break;
        case 'q':
            // Toggle sound with Q key
            const isEnabled = soundManager.toggle();
            document.getElementById('sound-btn').textContent = `Sound: ${isEnabled ? 'ON' : 'OFF'}`;
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
        toolUses: 10,
        frameCount: 0,
        gameOver: false,
        entrance: { x: 50, y: 30 },
        exit: { x: 720, y: 440 },
        message: ''
    };
    initTerrain();
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    soundManager.gameStart();
}

// Initialize and start
initTerrain();
gameLoop();
