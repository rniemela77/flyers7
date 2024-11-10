class Example extends Phaser.Scene {
    preload() {
      this.load.setBaseURL("https://cdn.phaserfiles.com/v385");
      this.load.spritesheet("balls", "assets/sprites/balls.png", {
        frameWidth: 17,
        frameHeight: 17,
      });
    }
  
    create() {
      this.setupDragging();
  
      // create balls
      const ball1 = this.add.image(400, 300, "balls", 0);
      const ball2 = this.add.image(450, 350, "balls", 1);
      const ball3 = this.add.image(500, 400, "balls", 2);
  
      // add them to units group
      this.units = this.add.group([ball1, ball2, ball3]);
  
      // create graphics objects for each unit
      this.units.children.each((unit) => {
        unit.selectionCircle = this.add.graphics();
      });
  
      // array to store selected units
      this.selectedUnits = [];
  
      // physics
      this.physics.world.enable(this.units);
    }
  
    setupDragging() {
      const graphics = this.add.graphics();
  
      let color = 0xffff00;
      const thickness = 2;
      const alpha = 1;
  
      let sx = 0;
      let sy = 0;
      let draw = false;
  
      this.input.mouse.disableContextMenu();
  
      this.input.on("pointerdown", (pointer) => {
        sx = pointer.x;
        sy = pointer.y;
        draw = true;
  
        if (pointer.leftButtonDown() && pointer.rightButtonDown()) {
          color = 0x00ffff;
        } else if (pointer.leftButtonDown()) {
          color = 0xffff00;
        } else if (pointer.rightButtonDown()) {
          color = 0x00ff00;
        }
      });
  
      this.input.on("pointerup", () => {
        draw = false;
        graphics.clear();
        this.updateSelectedUnits();
      });
  
      this.input.on("pointermove", (pointer) => {
        if (draw && pointer.noButtonDown() === false) {
          graphics.clear();
          graphics.lineStyle(thickness, color, alpha);
          graphics.strokeRect(sx, sy, pointer.x - sx, pointer.y - sy);
          this.updateUnitSelection(sx, sy, pointer.x, pointer.y);
        }
      });
    }
  
    updateUnitSelection(sx, sy, ex, ey) {
      const rect = new Phaser.Geom.Rectangle(
        Math.min(sx, ex),
        Math.min(sy, ey),
        Math.abs(ex - sx),
        Math.abs(ey - sy)
      );
  
      this.units.children.each((unit) => {
        unit.selectionCircle.clear();
        if (Phaser.Geom.Rectangle.Overlaps(rect, unit.getBounds())) {
          unit.selectionCircle.lineStyle(2, 0x00ff00, 1);
          unit.selectionCircle.strokeCircle(unit.x, unit.y, unit.width);
        }
      });
    }
  
    updateSelectedUnits() {
      this.selectedUnits = [];
      this.units.children.each((unit) => {
        if (unit.selectionCircle.lineStyle) {
          this.selectedUnits.push(unit);
        }
      });
    }
  
    resetUnitSelection() {
      this.units.children.each((unit) => {
        unit.selectionCircle.clear();
      });
    }
  }
  
  const config = {
    type: Phaser.AUTO,
    parent: "phaser-example",
    width: window.innerWidth,
    height: window.innerHeight,
    disableContextMenu: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: true,
      },
    },
    scene: Example,
  };
  
  const game = new Phaser.Game(config);