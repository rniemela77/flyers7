// Configuration constants
const JOYSTICK_BASE_RADIUS = 100;
const JOYSTICK_THUMB_RADIUS = 70;
const JOYSTICK_BASE_COLOR = 0x888888;
const JOYSTICK_THUMB_COLOR = 0xcccccc;

const SPRITE_COLOR = 0x1F7CFF;
const RED_SQUARE_COLOR = 0xFF0000;

const PLAYER_SPEED = 0.1;
const SCORE_TEXT_STYLE = { font: '16px Courier', fill: '#000000' };

class Example extends Phaser.Scene {
    constructor() {
        super({ key: 'Example' });

        this.joystick = { base: null, thumb: null, pointerId: null, x: 0, y: 0, radius: JOYSTICK_BASE_RADIUS, initialX: 0, initialY: 0 };
        this.score = 0;
        this.playerSpeed = PLAYER_SPEED;
        this.redSquare = null;
    }

    preload() {
        this.load.setBaseURL('https://cdn.phaserfiles.com/v385');
        this.load.image('logo', 'assets/sprites/phaser3-logo.png');
    }

    create() {
        this.scale.scaleMode = Phaser.Scale.RESIZE;
        this.scale.on('resize', this.resize, this);

        this.input.addPointer(1);

        this.sprite = this.add.rectangle(0, 0, 50, 50, SPRITE_COLOR);
        this.createJoystick(this.joystick, window.innerWidth * 0.15, window.innerHeight * 0.85);

        this.scoreText = this.add.text(10, 10, 'Score: 0', SCORE_TEXT_STYLE);

        this.physics.world.enable(this.sprite);
        this.sprite.body.setBounce(1).setCollideWorldBounds(true);

        this.redSquare = this.add.rectangle(this.sprite.x, 0, 50, 50, RED_SQUARE_COLOR);

        this.resize({ width: window.innerWidth, height: window.innerHeight });

        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);

        this.sprite.x = window.innerWidth * 0.5;
        this.sprite.y = window.innerHeight * 0.5;
        this.redSquare.x = window.innerWidth * 0.5;
    }

    update() {
        const pointer = this.input.pointer1;

        if (pointer && pointer.isDown) {
            this.handleJoystick(pointer, this.joystick, this.sprite);
        } else if (pointer) {
            this.resetJoystick(pointer, this.joystick);
        }

        this.score += 1;
        this.scoreText.setText('Score: ' + this.score);

        this.redSquare.y += 2;

        if (this.redSquare.y > window.innerHeight) {
            this.redSquare.y = 0;
        }
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
            let deltaY = pointer.y - joystick.y;
            let distance = Phaser.Math.Clamp(Math.abs(deltaY), 0, joystick.radius);
            let angle = Math.atan2(deltaY, 0);
            joystick.thumb.y = joystick.y + Math.sin(angle) * distance;

            sprite.y += Math.sin(angle) * distance * this.playerSpeed;
        }
    }

    resetJoystick(pointer, joystick) {
        if (pointer.id === joystick.pointerId) {
            joystick.pointerId = null;
            this.updateJoystickPosition(joystick, joystick.initialX, joystick.initialY);
        }
    }

    onPointerDown(pointer) {
        this.updateJoystickPosition(this.joystick, pointer.x, pointer.y);
    }

    onPointerUp(pointer) {
        this.resetJoystick(pointer, this.joystick);
    }

    resize(gameSize) {
        const { width, height } = gameSize;

        this.cameras.resize(width, height);
        this.updateJoystickPosition(this.joystick, width * 0.15, height * 0.85);
    }

    updateJoystickPosition(joystick, x, y) {
        joystick.x = x;
        joystick.y = y;
        joystick.base.setPosition(x, y);
        joystick.thumb.setPosition(x, y);
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
            // debug: false
            debug: true
        }
    }
};

const game = new Phaser.Game(config);