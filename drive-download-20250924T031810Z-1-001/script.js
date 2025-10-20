const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeEl = document.getElementById('time');
const difficultyScreen = document.getElementById('difficulty-screen');
const easyBtn = document.getElementById('easy-btn');
const normalBtn = document.getElementById('normal-btn');
const hardBtn = document.getElementById('hard-btn');
const howToPlayBtn = document.getElementById('how-to-play-btn');
const howToPlayScreen = document.getElementById('how-to-play-screen');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');
const backToMainMenuBtn = document.getElementById('back-to-main-menu-btn');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 600;

// Create an in-memory canvas for the track
const trackCanvas = document.createElement('canvas');
trackCanvas.width = canvas.width;
trackCanvas.height = canvas.height;
const trackCtx = trackCanvas.getContext('2d', { willReadFrequently: true });

// Game state
let gameActive = false;
let laps = 0;
let currentCheckpoint = 0;
let gameState = 'difficulty';
let startTime;
const timeLimit = 240; // 4 minutes

// Game settings
let numberOfOpponents = 7;
const requiredLaps = 2;
const immunityDuration = 5000; // 5 seconds

let currentDifficultySettings;
const difficulties = {
    easy: { opponents: 4, totalItems: 6, shields: 4 },    // 4 shields, 2 bananas
    normal: { opponents: 7, totalItems: 5, shields: 2 },  // 2 shields, 3 bananas
    hard: { opponents: 10, totalItems: 5, shields: 1 }      // 1 shield, 4 bananas
};

// Car image assets
const playerCarImg = new Image();
playerCarImg.src = 'player_car.png';

const opponentCarImg = new Image();
opponentCarImg.src = 'opponent_car.png';

const bananaImg = new Image();
bananaImg.src = 'banana.png';

// Player car properties
const player = {
    x: canvas.width / 2,
    y: 150, // Start on the track
    width: 30, height: 50, img: playerCarImg, angle: 0, moveSpeed: 0,
    maxSpeed: 8, turnSpeed: 0.05, acceleration: 0.1, friction: 0.05,
    slipping: false, slipAngle: 0, slipTime: 0,
    immunity: false, immunityTime: 0,
    hasMoved: false,
    imageOrientation: 'right'
};

const opponents = [];
const items = [];
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

const checkpoints = [
    { x: canvas.width / 2, y: 150, passed: false },
    { x: canvas.width - 150, y: canvas.height / 2, passed: false },
    { x: canvas.width / 2, y: canvas.height - 150, passed: false },
    { x: 150, y: canvas.height / 2, passed: false }
];

function setDifficulty(difficulty) {
    currentDifficultySettings = difficulties[difficulty];
    numberOfOpponents = currentDifficultySettings.opponents;
    gameState = 'playing';
    difficultyScreen.style.display = 'none';
    startGame();
}

easyBtn.addEventListener('click', () => setDifficulty('easy'));
normalBtn.addEventListener('click', () => setDifficulty('normal'));
hardBtn.addEventListener('click', () => setDifficulty('hard'));

function updateTimer() {
    if (!gameActive) return;
    const elapsedTime = (Date.now() - startTime) / 1000;
    const remainingTime = Math.max(0, timeLimit - elapsedTime);
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (remainingTime <= 0) {
        gameOver();
    }
}

function resetPlayer() {
    laps = 0;
    currentCheckpoint = 0;
    checkpoints.forEach(cp => cp.passed = false);
    player.x = canvas.width / 2;
    player.y = 150; // Reset to starting line
    player.angle = 0;
    player.moveSpeed = 0;
    player.slipping = false;
    player.immunity = false;
    player.hasMoved = false;
    gameActive = true;
    spawnItems();
    startTime = Date.now();
}

function gameOver() {
    gameActive = false;
    gameState = 'gameOver';
    gameOverScreen.style.display = 'flex';
}

function gameWon() {
    gameActive = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawTrophy(canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = 'gold';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 + 100);
    ctx.font = '20px Arial';
    ctx.fillText('Press any key to restart', canvas.width / 2, canvas.height / 2 + 150);
}

function drawTrophy(x, y) {
    ctx.fillStyle = 'gold';
    ctx.beginPath();
    ctx.moveTo(x - 50, y - 50);
    ctx.lineTo(x - 50, y + 50);
    ctx.lineTo(x + 50, y + 50);
    ctx.lineTo(x + 50, y - 50);
    ctx.quadraticCurveTo(x, y - 100, x - 50, y - 50);
    ctx.fill();
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x - 10, y + 50, 20, 20);
}

function drawTrack() {
    // Set background to a more vibrant, textured grass color
    const grassGradient = trackCtx.createRadialGradient(canvas.width / 2, canvas.height / 2, 100, canvas.width / 2, canvas.height / 2, canvas.width);
    grassGradient.addColorStop(0, '#34C759'); // Brighter green
    grassGradient.addColorStop(1, '#2C9D46'); // Darker green
    trackCtx.fillStyle = grassGradient;
    trackCtx.fillRect(0, 0, trackCanvas.width, trackCanvas.height);

    // Draw the track path with a more noticeable gradient
    const trackGradient = trackCtx.createLinearGradient(0, 0, 0, canvas.height);
    trackGradient.addColorStop(0, '#888'); // Lighter grey
    trackGradient.addColorStop(1, '#666'); // Darker grey
    trackCtx.fillStyle = trackGradient;
    trackCtx.beginPath();
    trackCtx.moveTo(150, 100);
    trackCtx.lineTo(canvas.width - 150, 100);
    trackCtx.quadraticCurveTo(canvas.width - 100, 100, canvas.width - 100, 150);
    trackCtx.lineTo(canvas.width - 100, canvas.height - 150);
    trackCtx.quadraticCurveTo(canvas.width - 100, canvas.height - 100, canvas.width - 150, canvas.height - 100);
    trackCtx.lineTo(150, canvas.height - 100);
    trackCtx.quadraticCurveTo(100, canvas.height - 100, 100, canvas.height - 150);
    trackCtx.lineTo(100, 150);
    trackCtx.quadraticCurveTo(100, 100, 150, 100);
    trackCtx.closePath();
    trackCtx.fill();

    // Draw the inner grass area
    trackCtx.fillStyle = grassGradient; // same green as background
    trackCtx.beginPath();
    trackCtx.moveTo(250, 200);
    trackCtx.lineTo(canvas.width - 250, 200);
    trackCtx.quadraticCurveTo(canvas.width - 200, 200, canvas.width - 200, 250);
    trackCtx.lineTo(canvas.width - 200, canvas.height - 250);
    trackCtx.quadraticCurveTo(canvas.width - 200, canvas.height - 200, canvas.width - 250, canvas.height - 200);
    trackCtx.lineTo(250, canvas.height - 200);
    trackCtx.quadraticCurveTo(200, canvas.height - 200, 200, canvas.height - 250);
    trackCtx.lineTo(200, 250);
    trackCtx.quadraticCurveTo(200, 200, 250, 200);
    trackCtx.closePath();
    trackCtx.fill();

    // Draw a checkered start/finish line with better contrast
    const lineHeight = 100;
    const boxSize = 10;
    for (let i = 0; i < lineHeight / boxSize; i++) {
        for (let j = 0; j < 2; j++) {
            trackCtx.fillStyle = (i % 2 === j % 2) ? '#FFFFFF' : '#A9A9A9'; // White and DarkGray
            trackCtx.fillRect(canvas.width / 2 - boxSize + (j * boxSize), 100 + (i * boxSize), boxSize, boxSize);
        }
    }
}

function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    
    let rotation = car.angle;
    // Adjust rotation based on the sprite's original orientation
    if (car.imageOrientation === 'right') {
        rotation -= Math.PI / 2; // Rotate 90 degrees counter-clockwise
    } else if (car.imageOrientation === 'left') {
        rotation += Math.PI / 2; // Rotate 90 degrees clockwise
    } else if (car.imageOrientation === 'down') {
        rotation += Math.PI; // Rotate 180 degrees
    }
    // 'up' requires no adjustment

    ctx.rotate(rotation);

    // Draw a softer, closer shadow
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    // The y-offset is relative to the car's center. car.height/2 is the bottom of the car.
    ctx.ellipse(0, car.height / 2, car.width / 2.5, car.width / 4, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();


    if (car.immunity) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'gold';
    }
    ctx.drawImage(car.img, -car.width / 2, -car.height / 2, car.width, car.height);
    ctx.restore();
}

function spawnItems() {
    items.length = 0;
    // Fallback to normal settings if not set
    const settings = currentDifficultySettings || difficulties.normal;
    const bananasToSpawn = settings.totalItems - settings.shields;
    const shieldsToSpawn = settings.shields;

    const itemsToCreate = [];
    for (let i = 0; i < bananasToSpawn; i++) {
        itemsToCreate.push('banana');
    }
    for (let i = 0; i < shieldsToSpawn; i++) {
        itemsToCreate.push('immunity');
    }

    // Shuffle the list to randomize spawn order
    itemsToCreate.sort(() => Math.random() - 0.5);

    itemsToCreate.forEach(type => {
        let x, y;
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (!isPixelOnTrack(x, y));
        items.push({ type, x, y, size: 15 });
    });
}

function drawItems() {
    items.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === 'banana') {
            if (bananaImg && bananaImg.complete) {
                ctx.drawImage(bananaImg, -item.size, -item.size / 2, item.size * 2, item.size);
            }
        } else if (item.type === 'immunity') {
            ctx.fillStyle = '#C0C0C0'; // Silver
            ctx.beginPath();
            ctx.moveTo(0, -item.size);
            ctx.lineTo(-item.size, -item.size / 2);
            ctx.lineTo(-item.size, item.size / 2);
            ctx.quadraticCurveTo(0, item.size, item.size, item.size / 2);
            ctx.lineTo(item.size, -item.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FFD700'; // Gold trim
            ctx.font = 'bold ' + item.size + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 0, 0);
        }
        ctx.restore();
    });
}

function updatePlayer() {
    if (!gameActive) return;

    if (player.slipping) {
        player.angle += player.slipAngle;
        player.slipTime--;
        if (player.slipTime <= 0) {
            player.slipping = false;
        }
    } else {
        if (keys.ArrowUp) player.angle -= player.turnSpeed;
        if (keys.ArrowDown) player.angle += player.turnSpeed;
    }

    if (keys.ArrowRight) player.moveSpeed += player.acceleration;
    else if (keys.ArrowLeft) player.moveSpeed -= player.acceleration / 2;
    else {
        if (player.moveSpeed > 0) player.moveSpeed -= player.friction;
        if (player.moveSpeed < 0) player.moveSpeed += player.friction;
        if (Math.abs(player.moveSpeed) < player.friction) player.moveSpeed = 0;
    }
    if (player.moveSpeed > player.maxSpeed) player.moveSpeed = player.maxSpeed;
    if (player.moveSpeed < -player.maxSpeed / 2) player.moveSpeed = -player.maxSpeed / 2;

    if (player.moveSpeed !== 0) {
        player.hasMoved = true;
    }

    player.x += Math.sin(player.angle) * player.moveSpeed;
    player.y -= Math.cos(player.angle) * player.moveSpeed;

    if (player.immunity && Date.now() - player.immunityTime > immunityDuration) {
        player.immunity = false;
    }

    handleBoundaries(player);
    checkCheckpoint();
}

function checkCheckpoint() {
    const nextCp = checkpoints[currentCheckpoint];
    const dx = player.x - nextCp.x;
    const dy = player.y - nextCp.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 50) { // Checkpoint radius
        nextCp.passed = true;
        currentCheckpoint = (currentCheckpoint + 1) % checkpoints.length;

        if (currentCheckpoint === 0) { // Completed a lap
            const allPassed = checkpoints.every(cp => cp.passed);
            if (allPassed) {
                laps++;
                checkpoints.forEach(cp => cp.passed = false);
                if (laps >= requiredLaps) {
                    gameWon();
                }
            }
        }
    }
}

function isPixelOnTrack(x, y) {
    if (x < 0 || x >= trackCanvas.width || y < 0 || y >= trackCanvas.height) {
        return false;
    }
    const pixel = trackCtx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // If the difference between the highest and lowest RGB value is small, it's a shade of grey (the track).
    return (max - min) < 25;
}

function handleBoundaries(car) {
    if (car.x < 0 || car.x > canvas.width || car.y < 0 || car.y > canvas.height) {
        gameOver();
        return;
    }

    // Check if the car is on the track using the new helper function
    if (!isPixelOnTrack(car.x, car.y)) {
        gameOver();
    }
}

function resetOpponent(op, index) {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
        case 0: op.x = Math.random() * (canvas.width - 200) + 100; op.y = -50; op.angle = Math.PI; break;
        case 1: op.x = Math.random() * (canvas.width - 200) + 100; op.y = canvas.height + 50; op.angle = 0; break;
        case 2: op.x = -50; op.y = Math.random() * (canvas.height - 200) + 100; op.angle = Math.PI / 2; break;
        case 3: op.x = canvas.width + 50; op.y = Math.random() * (canvas.height - 200) + 100; op.angle = -Math.PI / 2; break;
    }
    // Speed is now deterministic based on the opponent's index
    op.moveSpeed = 2 + (index * 0.25);
}

function createOpponents() {
    opponents.length = 0;
    for (let i = 0; i < numberOfOpponents; i++) {
        const op = { width: 30, height: 50, img: opponentCarImg, imageOrientation: 'left' };
        resetOpponent(op, i); // Pass the index to determine speed
        opponents.push(op);
    }
}

function updateOpponents() {
    if (!gameActive) return;
    opponents.forEach((op, index) => {
        op.x += Math.sin(op.angle) * op.moveSpeed;
        op.y -= Math.cos(op.angle) * op.moveSpeed;

        for (let i = index + 1; i < opponents.length; i++) {
            const otherOp = opponents[i];
            const dx = op.x - otherOp.x;
            const dy = op.y - otherOp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = op.width / 2 + otherOp.width / 2;

            if (distance < minDistance) {
                const angle = Math.atan2(dy, dx);
                const overlap = minDistance - distance;
                const moveX = Math.cos(angle) * overlap / 2;
                const moveY = Math.sin(angle) * overlap / 2;

                op.x += moveX;
                op.y += moveY;
                otherOp.x -= moveX;
                otherOp.y -= moveY;
            }
        }

        if (op.x < -100 || op.x > canvas.width + 100 || op.y < -100 || op.y > canvas.height + 100) {
            resetOpponent(op, index); // Pass index here too
        }
    });
}

function checkCollisions() {
    if (!gameActive || !player.hasMoved) return;
    if (player.immunity) return;
    opponents.forEach(op => {
        const dx = player.x - op.x;
        const dy = player.y - op.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.width / 2 + op.width / 2) {
            gameOver();
        }
    });
}

function checkItemCollisions() {
    if (!gameActive) return;
    items.forEach((item, index) => {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.width / 2 + item.size) {
            if (item.type === 'banana') {
                player.slipping = true;
                player.slipAngle = Math.random() > 0.5 ? 0.1 : -0.1;
                player.slipTime = 30;
            } else if (item.type === 'immunity') {
                player.immunity = true;
                player.immunityTime = Date.now();
            }
            items.splice(index, 1);
            spawnItems(); // Respawn items
        }
    });
}

function gameLoop() {
    if (gameState === 'playing') {
        updatePlayer();
        updateOpponents();
        checkCollisions();
        checkItemCollisions();
        updateTimer();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(trackCanvas, 0, 0);
        drawItems();
        opponents.forEach(op => drawCar(op));
        drawCar(player);
    }

    requestAnimationFrame(gameLoop);
}

function startGame() {
    resetPlayer();
    createOpponents();
    spawnItems();
    gameActive = true;
}

window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = true;
    }
    if (!gameActive && gameState === 'playing') {
        resetPlayer();
    }
});
window.addEventListener('keyup', e => { if(keys.hasOwnProperty(e.key)) { e.preventDefault(); keys[e.key] = false; } });

drawTrack();
gameLoop(); // Start the main game loop once

howToPlayBtn.addEventListener('click', () => {
    difficultyScreen.style.display = 'none';
    howToPlayScreen.style.display = 'flex';
});

backToMenuBtn.addEventListener('click', () => {
    howToPlayScreen.style.display = 'none';
    difficultyScreen.style.display = 'flex';
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    gameState = 'playing';
    startGame();
});

backToMainMenuBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    difficultyScreen.style.display = 'flex';
    gameState = 'difficulty';
    const minutes = Math.floor(timeLimit / 60);
    const seconds = Math.floor(timeLimit % 60);
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
});