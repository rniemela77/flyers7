const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let square;
let moveUpButton;
let moveDownButton;
let moveDistance = 100;
let targetY;
let circle;
let yellowCircleOutline;
let healthBar;
let healthBarBackground;
let circleHealth;

function preload() {
  // Load any assets if necessary
}

function create() {
  // Reset circle health
  circleHealth = 100;

  // Add a square in the center of the screen
  square = this.add.rectangle(
    config.width / 2,
    config.height / 2,
    50,
    50,
    0xff0000
  );

  // Add up and down buttons
  moveUpButton = this.add
    .text(config.width / 2 - 100, config.height - 150, "Up", {
      fontSize: "48px",
      fill: "#fff",
    })
    .setInteractive()
    .on("pointerdown", () => moveSquare("up"));

  moveDownButton = this.add
    .text(config.width / 2 + 50, config.height - 150, "Down", {
      fontSize: "48px",
      fill: "#fff",
    })
    .setInteractive()
    .on("pointerdown", () => moveSquare("down"));

  // Add a circle at the top of the screen, centered along the x-axis
  circle = this.add.circle(config.width / 2, 0, 25, 0x0000ff);

  // Add a yellow circle outline 150px above the red square
  yellowCircleOutline = this.add.circle(
    config.width / 2,
    config.height / 2 - 150,
    25
  );
  yellowCircleOutline.setStrokeStyle(2, 0xffff00);

  // Initialize targetY to the current position of the square
  targetY = square.y;

  // Add a timer event to fill the yellow circle every 1 second
  this.time.addEvent({
    delay: 1000,
    callback: fillYellowCircle,
    callbackScope: this,
    loop: true,
  });

  // Add health bar background above the blue circle
  healthBarBackground = this.add.rectangle(
    circle.x,
    circle.y - 35,
    50,
    10,
    0x000000
  );

  // Add health bar above the blue circle
  healthBar = this.add.rectangle(circle.x, circle.y - 35, 50, 10, 0xff0000);
}

function update() {
  if (square.y !== targetY) {
    square.y = Phaser.Math.Linear(square.y, targetY, 0.05);
    if (Math.abs(square.y - targetY) < 1) {
      square.y = targetY;
      // Reset button opacity to full when the square stops moving
      moveUpButton.setAlpha(1);
      moveDownButton.setAlpha(1);
    }
  }

  // Move the circle downward slowly
  circle.y += 1;

  // Update the position of the yellow circle outline
  yellowCircleOutline.y = square.y - 150;

  // Update the position of the health bar and its background
  healthBarBackground.x = circle.x;
  healthBarBackground.y = circle.y - 35;
  healthBar.x = circle.x;
  healthBar.y = circle.y - 35;

  // Check for collision between the blue circle and the red square
  if (
    Phaser.Geom.Intersects.RectangleToRectangle(
      circle.getBounds(),
      square.getBounds()
    )
  ) {
    this.scene.restart();
  }
}

function moveSquare(direction) {
  if (direction === "up") {
    targetY = square.y - moveDistance;
  } else if (direction === "down") {
    targetY = square.y + moveDistance;
  }
  // Set button opacity to lower value when the square starts moving
  moveUpButton.setAlpha(0.5);
  moveDownButton.setAlpha(0.5);
}

function fillYellowCircle() {
  const yellowCircle = this.add.circle(
    yellowCircleOutline.x,
    yellowCircleOutline.y,
    25,
    0xffff00
  );
  this.time.delayedCall(250, () => {
    yellowCircle.destroy();
  });

  // Check for collision with the blue circle
  if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle)) {
    reduceCircleHealth.call(this);
  }
}

function reduceCircleHealth() {
  circleHealth -= 45;
  if (circleHealth < 0) {
    circleHealth = 0;
  }
  healthBar.width = (circleHealth / 100) * 50;

// Make it flash white
const changeCircleColor = () => {
    circle.setFillStyle(circle.fillColor === 0x0000ff ? 0xffffff : 0x0000ff);
};

for (let i = 50; i <= 200; i += 50) {
    this.time.delayedCall(i, changeCircleColor);
}

  if (circleHealth === 0) {
    // Restart the scene if the health reaches 0
    this.scene.restart();
  }
}
