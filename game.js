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
    const width = config.width;
    const height = config.height;

    graphics.lineStyle(1, 0xCCCCCC, 0.5);

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
        graphics.moveTo(x, 0);
        graphics.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
        graphics.moveTo(0, y);
        graphics.lineTo(width, y);
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

    // Draw a yellow circle around the motorcycle if the pointer is down
    circleGraphics.clear();
    if (this.input.activePointer.isDown) {
        circleGraphics.fillStyle(0xFFFF00, 1);
        const circleX = motorcycle.x;
        const circleY = motorcycle.y - 50; // Position the circle above the motorcycle
        circleGraphics.fillCircle(circleX, circleY, 10);
    }
}