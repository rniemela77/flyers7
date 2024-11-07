const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
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

function preload() {
    // Load assets here (e.g., images, sprites)
    this.load.image('sky', 'path/to/your/sky.png');
}

function create() {
    // Add your game elements here
    this.add.image(400, 300, 'sky');
}

function update() {
    // Game loop logic (e.g., movement)
}
