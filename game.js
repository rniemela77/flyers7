const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
      preload,
      create,
      update,
    },
  };
  
  const game = new Phaser.Game(config);
  
  let square,
    moveUpButton,
    moveDownButton,
    targetY,
    circle1,
    circle2,
    yellowCircleOutline,
    healthBar1,
    healthBarBackground1,
    healthBar2,
    healthBarBackground2,
    grid,
    targetingOutline1,
    targetingOutline2;
  let joystick = null,
    initialPointerX = 0,
    initialPointerY = 0,
    velocityX = 0,
    velocityY = 0,
    targetVelocityX = 0,
    targetVelocityY = 0,
    circleHealth1 = 100,
    circleHealth2 = 100;
  
  const moveDistance = 100;
  const gridSize = 800;
  const gridColor = 0x212121;
  const joystickRadius = 30;
  const joystickColor = 0x888888;
  const squareSize = 50;
  const squareColor = 0xff0000;
  const circleRadius = 25;
  const circleColor = 0x0000ff;
  const yellowCircleOutlineColor = 0xffff00;
  const healthBarWidth = 50;
  const healthBarHeight = 10;
  const healthBarBackgroundColor = 0x000000;
  const healthBarColor = 0xff0000;
  const acceleration = 0.1;
  const deceleration = 0.05;
  const maxSpeed = 5;
  const fillYellowCircleDelay = 1000;
  const fillYellowCircleDuration = 250;
  const reduceHealthAmount = 45;
  const resetHealth = 100;
  
  function preload() {
    // Load any assets if necessary
  }
  
  function create() {
    createGrid.call(this);
    setupInputHandlers.call(this);
    createGameObjects.call(this);
    setupTimers.call(this);
  }
  
  function createGrid() {
    grid = this.add.grid(
      config.width / 2,
      config.height / 2,
      config.width,
      config.height,
      gridSize,
      gridSize,
      gridColor
    );
  }
  
  function update() {
    updateJoystickVelocity();
    applyJoystickVelocity();
    moveCircleDownward();
    updateUIPositions();
    checkCollisions.call(this);
    updateGameObjects.call(this);
    updateTargeting();
  }
  
  function setupInputHandlers() {
    this.input.on("pointerdown", createJoystick, this);
    this.input.on("pointermove", moveJoystick, this);
    this.input.on("pointerup", removeJoystick, this);
  }
  
  function createGameObjects() {
    createSquare.call(this);
    createButtons.call(this);
    createCircles.call(this);
    createYellowCircleOutline.call(this);
    createHealthBars.call(this);
    createTargetingOutlines.call(this);
  }
  
  function setupTimers() {
    this.time.addEvent({
      delay: fillYellowCircleDelay,
      callback: fillYellowCircle,
      callbackScope: this,
      loop: true,
    });
  }
  
  function createJoystick(pointer) {
    initialPointerX = pointer.x;
    initialPointerY = pointer.y;
    joystick = this.add.circle(
      pointer.x,
      pointer.y,
      joystickRadius,
      joystickColor
    );
  }
  
  function moveJoystick(pointer) {
    if (joystick) {
      const deltaX = pointer.x - initialPointerX;
      const deltaY = pointer.y - initialPointerY;
      targetVelocityX = Phaser.Math.Clamp(deltaX * 0.1, -maxSpeed, maxSpeed);
      targetVelocityY = Phaser.Math.Clamp(deltaY * 0.1, -maxSpeed, maxSpeed);
    }
  }
  
  function removeJoystick() {
    if (joystick) {
      joystick.destroy();
      joystick = null;
      targetVelocityX = 0;
      targetVelocityY = 0;
    }
  }
  
  function createSquare() {
    square = this.add.rectangle(
      config.width / 2,
      config.height / 2,
      squareSize,
      squareSize,
      squareColor
    );
    targetY = square.y;
  }
  
  function createButtons() {
    moveUpButton = createButton.call(
      this,
      config.width / 2 - 100,
      config.height - 150,
      "Up",
      () => moveSquare("up")
    );
    moveDownButton = createButton.call(
      this,
      config.width / 2 + 50,
      config.height - 150,
      "Down",
      () => moveSquare("down")
    );
  }
  
  function createButton(x, y, text, callback) {
    return this.add
      .text(x, y, text, { fontSize: "48px", fill: "#fff" })
      .setInteractive()
      .on("pointerdown", callback);
  }
  
  function createCircles() {
    circle1 = this.add.circle(config.width / 2, 0, circleRadius, circleColor);
    circle2 = this.add.circle(config.width / 2 + 100, 0, circleRadius, circleColor);
  }
  
  function createYellowCircleOutline() {
    yellowCircleOutline = this.add.circle(
      config.width / 2,
      config.height / 2 - 150,
      circleRadius
    );
    yellowCircleOutline.setStrokeStyle(2, yellowCircleOutlineColor);
  }
  
  function createHealthBars() {
    healthBarBackground1 = this.add.rectangle(
      circle1.x,
      circle1.y - 35,
      healthBarWidth,
      healthBarHeight,
      healthBarBackgroundColor
    );
    healthBar1 = this.add.rectangle(
      circle1.x,
      circle1.y - 35,
      healthBarWidth,
      healthBarHeight,
      healthBarColor
    );
  
    healthBarBackground2 = this.add.rectangle(
      circle2.x,
      circle2.y - 35,
      healthBarWidth,
      healthBarHeight,
      healthBarBackgroundColor
    );
    healthBar2 = this.add.rectangle(
      circle2.x,
      circle2.y - 35,
      healthBarWidth,
      healthBarHeight,
      healthBarColor
    );
  }
  
  function createTargetingOutlines() {
    targetingOutline1 = this.add.circle(circle1.x, circle1.y, circleRadius + 5);
    targetingOutline1.setStrokeStyle(2, 0xffffff);
    targetingOutline1.setVisible(false);
  
    targetingOutline2 = this.add.circle(circle2.x, circle2.y, circleRadius + 5);
    targetingOutline2.setStrokeStyle(2, 0xffffff);
    targetingOutline2.setVisible(false);
  }
  
  function updateJoystickVelocity() {
    if (velocityX < targetVelocityX) {
      velocityX = Math.min(velocityX + acceleration, targetVelocityX);
    } else if (velocityX > targetVelocityX) {
      velocityX = Math.max(velocityX - deceleration, targetVelocityX);
    }
    if (velocityY < targetVelocityY) {
      velocityY = Math.min(velocityY + acceleration, targetVelocityY);
    } else if (velocityY > targetVelocityY) {
      velocityY = Math.max(velocityY - deceleration, targetVelocityY);
    }
  }
  
  function applyJoystickVelocity() {
    square.x += velocityX;
    square.y += velocityY;
  }
  
  function moveCircleDownward() {
    circle1.y += 1;
    circle2.y += 1;
  }
  
  function updateUIPositions() {
    const distanceFromSquare = 100;
    const angle = Phaser.Math.Angle.Between(
      square.x,
      square.y,
      targetingOutline1.visible ? targetingOutline1.x : targetingOutline2.x,
      targetingOutline1.visible ? targetingOutline1.y : targetingOutline2.y
    );
  
    yellowCircleOutline.x = square.x + distanceFromSquare * Math.cos(angle);
    yellowCircleOutline.y = square.y + distanceFromSquare * Math.sin(angle);
  
    healthBarBackground1.setPosition(circle1.x, circle1.y - 35);
    healthBar1.setPosition(circle1.x, circle1.y - 35);
  
    healthBarBackground2.setPosition(circle2.x, circle2.y - 35);
    healthBar2.setPosition(circle2.x, circle2.y - 35);
  
    targetingOutline1.setPosition(circle1.x, circle1.y);
    targetingOutline2.setPosition(circle2.x, circle2.y);
  }
  
  function checkCollisions() {
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        circle1.getBounds(),
        square.getBounds()
      ) ||
      Phaser.Geom.Intersects.RectangleToRectangle(
        circle2.getBounds(),
        square.getBounds()
      )
    ) {
      resetGame.call(this);
    }
  }
  
  function moveSquare(direction) {
    targetY =
      direction === "up" ? square.y - moveDistance : square.y + moveDistance;
    moveUpButton.setAlpha(0.5);
    moveDownButton.setAlpha(0.5);
  }
  
  function fillYellowCircle() {
    const yellowCircle = this.add.circle(
      yellowCircleOutline.x,
      yellowCircleOutline.y,
      circleRadius,
      yellowCircleOutlineColor
    );
    this.time.delayedCall(fillYellowCircleDuration, () => yellowCircle.destroy());
  
    if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle1)) {
      reduceCircleHealth.call(this, 1);
    } else if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle2)) {
      reduceCircleHealth.call(this, 2);
    }
  }
  
  function reduceCircleHealth(circleNumber) {
    if (circleNumber === 1) {
      circleHealth1 = Math.max(circleHealth1 - reduceHealthAmount, 0);
      healthBar1.width = (circleHealth1 / resetHealth) * healthBarWidth;
  
      if (circleHealth1 === 0) {
        circle1.setVisible(false);
        healthBar1.setVisible(false);
        healthBarBackground1.setVisible(false);
        targetingOutline1.setVisible(false);
      }
    } else if (circleNumber === 2) {
      circleHealth2 = Math.max(circleHealth2 - reduceHealthAmount, 0);
      healthBar2.width = (circleHealth2 / resetHealth) * healthBarWidth;
  
      if (circleHealth2 === 0) {
        circle2.setVisible(false);
        healthBar2.setVisible(false);
        healthBarBackground2.setVisible(false);
        targetingOutline2.setVisible(false);
      }
    }
  
    if (circleHealth1 === 0 && circleHealth2 === 0) {
      resetGame.call(this);
    }
  }
  
  function resetGame() {
    this.scene.restart();
    circleHealth1 = resetHealth;
    circleHealth2 = resetHealth;
    healthBar1.width = (circleHealth1 / resetHealth) * healthBarWidth;
    healthBar2.width = (circleHealth2 / resetHealth) * healthBarWidth;
    circle1.setFillStyle(circleColor);
    circle2.setFillStyle(circleColor);
  }
  
  function updateGameObjects() {
    const offsetX = config.width / 2 - square.x;
    const offsetY = config.height / 2 - square.y;
  
    circle1.x += offsetX;
    circle1.y += offsetY;
    circle2.x += offsetX;
    circle2.y += offsetY;
    yellowCircleOutline.x += offsetX;
    yellowCircleOutline.y += offsetY;
    healthBarBackground1.x += offsetX;
    healthBarBackground1.y += offsetY;
    healthBar1.x += offsetX;
    healthBar1.y += offsetY;
    healthBarBackground2.x += offsetX;
    healthBarBackground2.y += offsetY;
    healthBar2.x += offsetX;
    healthBar2.y += offsetY;
    grid.x += offsetX;
    grid.y += offsetY;
  
    square.x = config.width / 2;
    square.y = config.height / 2;
  }
  
  function updateTargeting() {
    const distanceToCircle1 = circle1.visible
      ? Phaser.Math.Distance.Between(square.x, square.y, circle1.x, circle1.y)
      : Infinity;
    const distanceToCircle2 = circle2.visible
      ? Phaser.Math.Distance.Between(square.x, square.y, circle2.x, circle2.y)
      : Infinity;
  
    if (distanceToCircle1 < distanceToCircle2) {
      targetingOutline1.setVisible(true);
      targetingOutline2.setVisible(false);
    } else {
      targetingOutline1.setVisible(false);
      targetingOutline2.setVisible(true);
    }
  }