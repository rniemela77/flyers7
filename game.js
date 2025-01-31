const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let motorcycle;
let gridGraphics;
let cursors;
let previousPointerX;
let steeringSensitivity = 0.1;

const rotationSpeed = 0.05;
let circleGraphics;
let trailGraphics;
let trailPoints = [];

function preload() {
    // Load motorcycle image
    this.load.image('motorcycle', 'path/to/motorcycle.png');
}

function create() {
    // Create motorcycle sprite at the center of the screen
    motorcycle = this.add.sprite(config.width / 2, config.height / 2, 'motorcycle');
    motorcycle.setOrigin(0.5, 0.5);

    // Create grid graphics
    gridGraphics = this.add.graphics();
    drawGrid(gridGraphics);

    // Create graphics for circles
    circleGraphics = this.add.graphics();

    // Create graphics for trail
    trailGraphics = this.add.graphics();

    // Center the grid on the motorcycle
    gridGraphics.x = motorcycle.x - config.width / 2;
    gridGraphics.y = motorcycle.y - config.height / 2;

    // Set up cursor keys for input
    cursors = this.input.keyboard.createCursorKeys();

    // Make the camera follow the motorcycle
    this.cameras.main.startFollow(motorcycle);

    // Initialize previous pointer position
    previousPointerX = null;
}

function drawGrid(graphics) {
    const gridSize = 50;
    const gridWidth = config.width * 2; // Double the width
    const gridHeight = config.height * 2; // Double the height

    graphics.lineStyle(1, 0xCCCCCC, 0.5);

    // Draw vertical lines
    for (let x = -gridWidth / 2; x <= gridWidth / 2; x += gridSize) {
        graphics.moveTo(x, -gridHeight / 2);
        graphics.lineTo(x, gridHeight / 2);
    }

    // Draw horizontal lines
    for (let y = -gridHeight / 2; y <= gridHeight / 2; y += gridSize) {
        graphics.moveTo(-gridWidth / 2, y);
        graphics.lineTo(gridWidth / 2, y);
    }

    graphics.strokePath();
}

function update() {
    const rotationSpeed = 0.1;
    const acceleration = 2;

    // Calculate pointer movement only when pointer is down
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
        if (previousPointerX === null) {
            previousPointerX = pointer.x; // Initialize previousPointerX on first press
        }
        const deltaX = pointer.x - previousPointerX;

        // Adjust motorcycle angle based on pointer movement with sensitivity
        motorcycle.angle += deltaX * rotationSpeed * steeringSensitivity;
    } else {
        previousPointerX = null; // Reset previousPointerX when pointer is up
    }

    // Move motorcycle forward in the direction it's facing
    const angleInRadians = Phaser.Math.DegToRad(motorcycle.angle);
    motorcycle.x += Math.cos(angleInRadians) * acceleration;
    motorcycle.y += Math.sin(angleInRadians) * acceleration;

    // Keep the motorcycle within the bounds of the screen
    motorcycle.x = Phaser.Math.Wrap(motorcycle.x, 0, config.width);
    motorcycle.y = Phaser.Math.Wrap(motorcycle.y, 0, config.height);

    // Rotate the camera to match the motorcycle's angle in the opposite direction
    this.cameras.main.rotation = -Phaser.Math.DegToRad(motorcycle.angle) - Math.PI / 2;

    // Add current position to trail points
    trailPoints.push({ x: motorcycle.x, y: motorcycle.y });
    if (trailPoints.length > 50) {
        trailPoints.shift(); // Limit the number of points in the trail
    }

    // Draw the trail
    trailGraphics.clear();
    trailGraphics.lineStyle(2, 0xFFFF00, 1);
    trailGraphics.beginPath();
    for (let i = 0; i < trailPoints.length - 1; i++) {
        trailGraphics.moveTo(trailPoints[i].x, trailPoints[i].y);
        trailGraphics.lineTo(trailPoints[i + 1].x, trailPoints[i + 1].y);
    }
    trailGraphics.strokePath();
}