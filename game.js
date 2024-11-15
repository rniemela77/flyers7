// Configuration constants
const JOYSTICK_BASE_RADIUS = 100;
const JOYSTICK_THUMB_RADIUS = 70;
const JOYSTICK_BASE_COLOR = 0x888888;
const JOYSTICK_THUMB_COLOR = 0xcccccc;

const SPRITE1_COLOR = 0x1F7CFF;
const SPRITE2_COLOR = 0xFF3535;

const OBSTACLE_COLOR = 0x000000;
const OBSTACLE_SPEED = 150;
const PLAYER_SPEED = 0.2;

const TRAIL_COLOR_SPRITE1 = SPRITE1_COLOR;
const TRAIL_COLOR_SPRITE2 = SPRITE2_COLOR;
const TRAIL_LINE_WIDTH = 2;
const MAX_TRAIL_LENGTH = 100;

const SCORE_TEXT_STYLE = { font: '16px Courier', fill: '#000000' };
class Example extends Phaser.Scene {
    constructor() {
        super({ key: 'Example' });

        // Joystick configurations
        this.leftJoystick = { base: null, thumb: null, pointerId: null, x: 0, y: 0, radius: JOYSTICK_BASE_RADIUS, initialX: 0, initialY: 0, holdTime: 0 };
        this.rightJoystick = { base: null, thumb: null, pointerId: null, x: 0, y: 0, radius: JOYSTICK_BASE_RADIUS, initialX: 0, initialY: 0, holdTime: 0 };

        // Game state
        this.score = 0;
        this.scoreText = null;
        this.obstacles = null;

        this.obstacleSpeed = OBSTACLE_SPEED;
        this.playerSpeed = PLAYER_SPEED;

        // Trail data
        this.sprite1Trail = [];
        this.sprite2Trail = [];
        this.maxTrailLength = MAX_TRAIL_LENGTH; // Maximum number of trail points
    }

    preload() {
        // Load assets
        this.load.setBaseURL('https://cdn.phaserfiles.com/v385');
        this.load.image('logo', 'assets/sprites/phaser3-logo.png');
        this.load.image('obstacle', 'assets/sprites/block.png');
    }

    create() {
        // Make the game responsive to resizing
        this.scale.scaleMode = Phaser.Scale.RESIZE;
        this.scale.on('resize', this.resize, this);

        // Add extra pointers for joystick control
        this.input.addPointer(2);

        // Create sprites (white triangles for now)
        this.sprite1 = this.add.triangle(window.innerWidth * 0.25, window.innerHeight * 0.5, 0, 0, 0, 50, 50, 25, SPRITE1_COLOR);
        this.sprite2 = this.add.triangle(window.innerWidth * 0.75, window.innerHeight * 0.5, 0, 0, 0, 50, 50, 25, SPRITE2_COLOR);

        // Draw joysticks
        this.createJoystick(this.leftJoystick, window.innerWidth * 0.15, window.innerHeight * 0.85);
        this.createJoystick(this.rightJoystick, window.innerWidth * 0.85, window.innerHeight * 0.85);

        // Graphics for visualization
        this.graphics = this.add.graphics();

        // Score display
        this.scoreText = this.add.text(10, 10, 'Score: 0', SCORE_TEXT_STYLE);

        // Obstacle group
        this.obstacles = this.physics.add.group();

        // Timer for obstacle generation
        this.time.addEvent({
            delay: 1000,  // 1 second delay
            callback: this.generateObstacle,
            callbackScope: this,
            loop: true
        });

        // Collider to detect obstacle collision with sprites
        this.physics.add.collider(this.sprite1, this.obstacles, this.gameOver, null, this);
        this.physics.add.collider(this.sprite2, this.obstacles, this.gameOver, null, this);

        // sprites physics
        this.physics.world.enable([this.sprite1, this.sprite2]);

        // Set sprite bounce
        this.sprite1.body.setBounce(1);
        this.sprite2.body.setBounce(1);

        // sprites collide with world bounds
        this.sprite1.body.setCollideWorldBounds(true);
        this.sprite2.body.setCollideWorldBounds(true);

        // Resize the game to fit the screen
        this.resize({ width: window.innerWidth, height: window.innerHeight });

        // Add pointerdown and pointerup event listeners
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
    }

    update() {
        const pointers = [this.input.pointer1, this.input.pointer2];

        pointers.forEach(pointer => {
            if (pointer && pointer.isDown) {
                this.handleJoystick(pointer, this.leftJoystick, this.sprite1);
                this.handleJoystick(pointer, this.rightJoystick, this.sprite2);
            } else if (pointer) {
                this.resetJoystick(pointer, this.leftJoystick);
                this.resetJoystick(pointer, this.rightJoystick);
            }
        });

        // Update score based on time survived
        this.score += 1;
        this.scoreText.setText('Score: ' + this.score);

        // Update trails
        this.updateTrail(this.sprite1, this.sprite1Trail);
        this.updateTrail(this.sprite2, this.sprite2Trail);

        // Clear graphics once per frame
        this.graphics.clear();

        // Draw trails
        this.drawTrail(this.sprite1Trail, TRAIL_COLOR_SPRITE1);
        this.drawTrail(this.sprite2Trail, TRAIL_COLOR_SPRITE2);
    }

    createJoystick(joystick, x, y) {
        joystick.x = x;
        joystick.y = y;
        joystick.initialX = x;
        joystick.initialY = y;
        joystick.base = this.add.circle(x, y, joystick.radius, JOYSTICK_BASE_COLOR);
        joystick.thumb = this.add.circle(x, y, JOYSTICK_THUMB_RADIUS, JOYSTICK_THUMB_COLOR);
    }

    handleJoystick(pointer, joystick, sprite) {
        if (joystick.pointerId === null && Phaser.Math.Distance.Between(pointer.x, pointer.y, joystick.x, joystick.y) < joystick.radius) {
            joystick.pointerId = pointer.id;
        }
    
        if (pointer.id === joystick.pointerId) {
            let deltaX = pointer.x - joystick.x;
            let deltaY = pointer.y - joystick.y;
            let distance = Phaser.Math.Clamp(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 0, joystick.radius);
            let angle = Math.atan2(deltaY, deltaX);
            joystick.thumb.x = joystick.x + Math.cos(angle) * distance;
            joystick.thumb.y = joystick.y + Math.sin(angle) * distance;
    
            // Increase hold time
            joystick.holdTime += this.game.loop.delta;
    
            // Calculate speed based on hold time and scale it down
            let speed = (this.playerSpeed * (1 + joystick.holdTime / 1000)) * 0.1; // Adjust the 0.1 factor to control sensitivity
    
            // Move sprite using joystick
            sprite.x += Math.cos(angle) * distance * speed;
            sprite.y += Math.sin(angle) * distance * speed;
    
            // rotate sprite
            sprite.rotation = angle;
        }
    }

    resetJoystick(pointer, joystick) {
        if (pointer.id === joystick.pointerId) {
            joystick.pointerId = null;
            joystick.thumb.x = joystick.initialX;
            joystick.thumb.y = joystick.initialY;
            joystick.x = joystick.initialX;
            joystick.y = joystick.initialY;
            joystick.base.setPosition(joystick.initialX, joystick.initialY);
            joystick.thumb.setPosition(joystick.initialX, joystick.initialY);
            joystick.holdTime = 0; // Reset hold time
        }
    }

    onPointerDown(pointer) {
        if (pointer.x < this.scale.width / 2) {
            this.updateJoystickPosition(this.leftJoystick, pointer.x, pointer.y);
        } else {
            this.updateJoystickPosition(this.rightJoystick, pointer.x, pointer.y);
        }
    }

    onPointerUp(pointer) {
        this.resetJoystick(pointer, this.leftJoystick);
        this.resetJoystick(pointer, this.rightJoystick);
    }

    generateObstacle() {
        // Randomly generate obstacles on either the left or right side
        let lane = Phaser.Math.Between(0, 1); // 0 for left, 1 for right
        let xPosition = lane === 0 ? 200 : 600;

        let obstacle = this.obstacles.create(xPosition, 0, 'obstacle');
        obstacle.setVelocityY(this.obstacleSpeed + this.score * 0.1); // Increase speed based on score
    }

    gameOver(sprite, obstacle) {
        this.scene.restart(); // Restart the scene on collision
    }

    resize(gameSize, baseSize, displaySize, resolution) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);

        // Adjust joystick positions based on new screen size
        this.updateJoystickPosition(this.leftJoystick, width * 0.15, height * 0.85);
        this.updateJoystickPosition(this.rightJoystick, width * 0.85, height * 0.85);
    }

    updateJoystickPosition(joystick, x, y) {
        joystick.x = x;
        joystick.y = y;
        joystick.base.setPosition(x, y);
        joystick.thumb.setPosition(x, y);
    }

    updateTrail(sprite, trail) {
        trail.push({ x: sprite.x, y: sprite.y });
        if (trail.length > this.maxTrailLength) {
            trail.shift();
        }
    }

    drawTrail(trail, color) {
        this.graphics.lineStyle(TRAIL_LINE_WIDTH, color, 1);
        for (let i = 0; i < trail.length - 1; i++) {
            this.graphics.lineBetween(trail[i].x, trail[i].y, trail[i + 1].x, trail[i + 1].y);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#efefef',
    scene: Example,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);