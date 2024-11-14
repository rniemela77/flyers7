class Example extends Phaser.Scene {
    graphics;
    leftJoystick = { base: null, thumb: null, pointerId: null, x: 100, y: 500, radius: 50 };
    rightJoystick = { base: null, thumb: null, pointerId: null, x: 700, y: 500, radius: 50 };
    score = 0;
    scoreText;
    obstacles;

    preload() {
        this.load.setBaseURL('https://cdn.phaserfiles.com/v385');
        this.load.image('logo', 'assets/sprites/phaser3-logo.png');
        this.load.image('obstacle', 'assets/sprites/block.png');
    }

    create() {
        // Make the game responsive to resizing
        this.scale.scaleMode = Phaser.Scale.RESIZE;
        this.scale.on('resize', this.resize, this);

        // We need 2 extra pointers, as we only get 1 by default
        this.input.addPointer(2);

        // Sprites to move
        this.sprite1 = this.add.sprite(400, 100, 'logo');
        this.sprite2 = this.add.sprite(400, 300, 'logo');

        // Draw joysticks
        this.leftJoystick.base = this.add.circle(this.leftJoystick.x, this.leftJoystick.y, this.leftJoystick.radius, 0x888888);
        this.leftJoystick.thumb = this.add.circle(this.leftJoystick.x, this.leftJoystick.y, 20, 0xcccccc);

        this.rightJoystick.base = this.add.circle(this.rightJoystick.x, this.rightJoystick.y, this.rightJoystick.radius, 0x888888);
        this.rightJoystick.thumb = this.add.circle(this.rightJoystick.x, this.rightJoystick.y, 20, 0xcccccc);

        // Graphics for visualization
        this.graphics = this.add.graphics();

        // Score display
        this.scoreText = this.add.text(10, 10, 'Score: 0', { font: '16px Courier', fill: '#000000' });

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
    }

    update() {
        const pointers = [this.input.pointer1, this.input.pointer2];

        pointers.forEach(pointer => {
            if (pointer && pointer.isDown) {
                // Check if pointer is inside left joystick
                if (this.leftJoystick.pointerId === null && Phaser.Math.Distance.Between(pointer.x, pointer.y, this.leftJoystick.x, this.leftJoystick.y) < this.leftJoystick.radius) {
                    this.leftJoystick.pointerId = pointer.id;
                }
                // Check if pointer is inside right joystick
                if (this.rightJoystick.pointerId === null && Phaser.Math.Distance.Between(pointer.x, pointer.y, this.rightJoystick.x, this.rightJoystick.y) < this.rightJoystick.radius) {
                    this.rightJoystick.pointerId = pointer.id;
                }

                // Move left joystick thumb
                if (pointer.id === this.leftJoystick.pointerId) {
                    let deltaX = pointer.x - this.leftJoystick.x;
                    let deltaY = pointer.y - this.leftJoystick.y;
                    let distance = Phaser.Math.Clamp(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 0, this.leftJoystick.radius);
                    let angle = Math.atan2(deltaY, deltaX);
                    this.leftJoystick.thumb.x = this.leftJoystick.x + Math.cos(angle) * distance;
                    this.leftJoystick.thumb.y = this.leftJoystick.y + Math.sin(angle) * distance;

                    // Move sprite1 using left joystick
                    this.sprite1.x += Math.cos(angle) * distance * 0.01;
                    this.sprite1.y += Math.sin(angle) * distance * 0.01;
                }

                // Move right joystick thumb
                if (pointer.id === this.rightJoystick.pointerId) {
                    let deltaX = pointer.x - this.rightJoystick.x;
                    let deltaY = pointer.y - this.rightJoystick.y;
                    let distance = Phaser.Math.Clamp(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 0, this.rightJoystick.radius);
                    let angle = Math.atan2(deltaY, deltaX);
                    this.rightJoystick.thumb.x = this.rightJoystick.x + Math.cos(angle) * distance;
                    this.rightJoystick.thumb.y = this.rightJoystick.y + Math.sin(angle) * distance;

                    // Move sprite2 using right joystick
                    this.sprite2.x += Math.cos(angle) * distance * 0.01;
                    this.sprite2.y += Math.sin(angle) * distance * 0.01;
                }
            } else if (pointer) {
                // Reset joystick if pointer is released
                if (pointer.id === this.leftJoystick.pointerId) {
                    this.leftJoystick.pointerId = null;
                    this.leftJoystick.thumb.x = this.leftJoystick.x;
                    this.leftJoystick.thumb.y = this.leftJoystick.y;
                }
                if (pointer.id === this.rightJoystick.pointerId) {
                    this.rightJoystick.pointerId = null;
                    this.rightJoystick.thumb.x = this.rightJoystick.x;
                    this.rightJoystick.thumb.y = this.rightJoystick.y;
                }
            }
        });

        // Update score based on time survived
        this.score += 1;
        this.scoreText.setText('Score: ' + this.score);
    }

    generateObstacle() {
        // Randomly generate obstacles on either the left or right side
        let lane = Phaser.Math.Between(0, 1); // 0 for left, 1 for right
        let xPosition = lane === 0 ? 200 : 600;

        let obstacle = this.obstacles.create(xPosition, 0, 'obstacle');
        obstacle.setVelocityY(150 + this.score * 0.1); // Increase speed based on score
    }

    gameOver(sprite, obstacle) {
        this.scene.restart(); // Restart the scene on collision
    }

    resize(gameSize, baseSize, displaySize, resolution) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);

        // Adjust joystick positions based on new screen size
        this.leftJoystick.x = width * 0.15;
        this.leftJoystick.y = height * 0.85;
        this.leftJoystick.base.setPosition(this.leftJoystick.x, this.leftJoystick.y);
        this.leftJoystick.thumb.setPosition(this.leftJoystick.x, this.leftJoystick.y);

        this.rightJoystick.x = width * 0.85;
        this.rightJoystick.y = height * 0.85;
        this.rightJoystick.base.setPosition(this.rightJoystick.x, this.rightJoystick.y);
        this.rightJoystick.thumb.setPosition(this.rightJoystick.x, this.rightJoystick.y);
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
