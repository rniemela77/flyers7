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
let player;
let buildings = [];
let cursors;
let joystick;
let dragDistance = 0;
let dragAngle = 0;
let joystickPointerId = null;
let camera;
const MAX_SPEED = 200;
let uiCamera;
let directionIndicator;

function preload() {
    // No assets to load
}

function create() {
    // Create player as a simple circle
    player = this.add.circle(window.innerWidth / 2, window.innerHeight / 2, 15, 0x0000ff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // Create buildings
    buildings.push(createBuilding(this, 200, 200, true));  // Building with an open door
    buildings.push(createBuilding(this, 500, 400, false)); // Building without an open door

    // Set up main camera to follow player and zoom in
    camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, window.innerWidth, window.innerHeight);
    camera.setZoom(2); // Zoom in for a closer view of the player

    // Create a virtual joystick (initially hidden)
    joystick = this.add.circle(0, 0, 40, 0x888888).setAlpha(0.5).setVisible(false);
    joystick.inner = this.add.circle(0, 0, 20, 0x444444).setAlpha(0.8).setVisible(false);

    // Create a direction indicator attached to the player (initially hidden)
    directionIndicator = this.add.line(0, 0, 0, 0, 0, -30, 0xff0000).setAlpha(0.8).setVisible(false);
    directionIndicator.setOrigin(0.5, 0.5);
    this.physics.add.existing(directionIndicator);

    // Create a secondary camera layer for the joystick UI
    uiCamera = this.cameras.add(0, 0, window.innerWidth, window.innerHeight);
    uiCamera.ignore([player, ...buildings, directionIndicator]);

    // Ignore joystick and inner joystick for the main camera
    camera.ignore([joystick, joystick.inner]);

    // Enable pointer events for both desktop and mobile
    this.input.on('pointerdown', function (pointer) {
        joystickPointerId = pointer.id;
        joystick.setPosition(pointer.x, pointer.y).setVisible(true);
        joystick.inner.setPosition(pointer.x, pointer.y).setVisible(true);
        directionIndicator.setVisible(true);
    }, this);

    // Pointer move event to simulate joystick drag
    this.input.on('pointermove', function (pointer) {
        if (pointer.id === joystickPointerId && joystick.visible) {
            dragDistance = Phaser.Math.Distance.Between(joystick.x, joystick.y, pointer.x, pointer.y);
            dragAngle = Phaser.Math.Angle.Between(joystick.x, joystick.y, pointer.x, pointer.y);

            // Restrict drag distance to joystick radius
            if (dragDistance > 40) {
                const limitedX = joystick.x + Math.cos(dragAngle) * 40;
                const limitedY = joystick.y + Math.sin(dragAngle) * 40;
                joystick.inner.setPosition(limitedX, limitedY);
            } else {
                joystick.inner.setPosition(pointer.x, pointer.y);
            }

            // Update direction indicator attached to the player
            directionIndicator.setPosition(player.x, player.y);
            directionIndicator.setRotation(dragAngle + Math.PI / 2); // Correcting angle offset by 90 degrees
            directionIndicator.setVisible(true);
        }
    });

    // Pointer up event to hide joystick
    this.input.on('pointerup', function (pointer) {
        if (pointer.id === joystickPointerId) {
            dragDistance = 0;
            dragAngle = 0;
            joystickPointerId = null;
            joystick.setVisible(false);
            joystick.inner.setVisible(false);
            directionIndicator.setVisible(false);
        }
    });
}


function createBuilding(scene, x, y, hasOpenDoor) {
    const building = scene.add.rectangle(x, y, 100, 100, 0x8B4513);
    scene.physics.add.existing(building, true);
    
    if (hasOpenDoor) {
        // Add a door representation as a rectangle on the building
        const door = scene.add.rectangle(x, y + 30, 20, 40, 0x00ff00);
        scene.physics.add.existing(door, true);
        scene.physics.add.overlap(player, door, enterBuilding, null, scene);
    }

    return building;
}

function enterBuilding(player, door) {
    console.log("Entered a building with an open door!");
}

function update() {
    // Update player velocity based on joystick drag, with a max speed limit
    if (dragDistance > 0) {
        let velocityX = Math.cos(dragAngle) * dragDistance * 5;
        let velocityY = Math.sin(dragAngle) * dragDistance * 5;

        // Cap velocity to max speed
        if (velocityX > MAX_SPEED) velocityX = MAX_SPEED;
        if (velocityX < -MAX_SPEED) velocityX = -MAX_SPEED;
        if (velocityY > MAX_SPEED) velocityY = MAX_SPEED;
        if (velocityY < -MAX_SPEED) velocityY = -MAX_SPEED;

        player.body.setVelocity(velocityX, velocityY);
        directionIndicator.setPosition(player.x, player.y);
    } else {
        player.body.setVelocity(0, 0);
    }
}
