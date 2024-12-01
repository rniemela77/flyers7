import Character from "./Character";
import { CONSTANTS } from "../constants";

export default class Player extends Character {
  constructor(scene, x, y) {
    super(scene, x, y, {
      maxHealth: CONSTANTS.playerHealth,
      spriteType: "rectangle",
      size: CONSTANTS.squareSize,
      color: CONSTANTS.squareColor
    });

    this.velocity = { x: 0, y: 0 };
  }

  update() {
    this.sprite.x += this.velocity.x;
    this.sprite.y += this.velocity.y;
    
    // Update health bar position
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - CONSTANTS.squareSize - 10;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - CONSTANTS.squareSize - 10;
  }

  setVelocity(x, y) {
    this.velocity.x = x;
    this.velocity.y = y;
  }

  resetPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }
} 