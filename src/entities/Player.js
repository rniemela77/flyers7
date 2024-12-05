import Entity from './Entity';
import { GAME_CONFIG } from '../config/gameConfig';

export default class Player extends Entity {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', {
      scale: 0.5,
      depth: 1,
    });
    
    this.speed = 200;
    this.setupPhysics();
  }

  setupPhysics() {
    this.sprite.setDrag(1000);
    this.sprite.setBounce(0.2);
    this.sprite.setMaxVelocity(300);
  }

  move(direction) {
    const normalizedDirection = direction.normalize();
    this.setVelocity(
      normalizedDirection.x * this.speed,
      normalizedDirection.y * this.speed
    );
  }

  update() {
    // Add any player-specific update logic here
    if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0) {
      const angle = Math.atan2(this.sprite.body.velocity.y, this.sprite.body.velocity.x);
      this.sprite.setRotation(angle);
    }
  }
} 