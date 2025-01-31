const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
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

    // Calculate circle size as 25% of the map's width or height
    const circleSize = Math.min(config.width, config.height) * 0.25;

    // Calculate the position in front of the motorcycle
    const offsetDistance = 140; // Distance in front of the motorcycle
    const angleInRadians = Phaser.Math.DegToRad(motorcycle.angle);
    const frontX = motorcycle.x + Math.cos(angleInRadians) * offsetDistance;
    const frontY = motorcycle.y + Math.sin(angleInRadians) * offsetDistance;

    // Draw the circle
    circleGraphics.fillStyle(0x333333, 1); // Dark grey color
    circleGraphics.fillCircle(frontX, frontY, circleSize / 2);

    // Enable physics for the motorcycle and set its body to a circle
    this.physics.add.existing(motorcycle);
    motorcycle.body.setCircle(motorcycle.width / 2);

    // Create a circle with physics at the calculated position
    const circle = this.add.circle(frontX, frontY, circleSize / 2, 0x333333);
    this.physics.add.existing(circle);
    circle.body.setCircle(circleSize / 2);

    // Add collision detection between the motorcycle and the circle
    this.physics.add.collider(motorcycle, circle, () => {
        console.log('Collision detected!');
        // Handle collision logic here
    });
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