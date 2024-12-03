import { CONSTANTS } from "../constants";

export default class DashManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.isDashing = false;
    this.canDash = true;
    this.dashDirection = { x: 0, y: 0 };
    this.lastDashTime = 0;
  }

  dash(directionX, directionY) {
    if (!this.canDash || this.isDashing) return;

    // Normalize direction
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    if (length === 0) return;

    this.dashDirection.x = directionX / length;
    this.dashDirection.y = directionY / length;
    
    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = this.scene.time.now;

    // Set velocity in dash direction
    this.player.setVelocity(this.dashDirection.x, this.dashDirection.y);

    // Reset dash after duration
    this.scene.time.delayedCall(CONSTANTS.dashDuration, () => {
      this.isDashing = false;
      // Reset velocity after dash
      if (this.player.sprite?.body) {
        this.player.sprite.body.setVelocity(0, 0);
      }
    });

    // Reset dash cooldown
    this.scene.time.delayedCall(CONSTANTS.dashCooldown, () => {
      this.canDash = true;
    });
  }

  update() {
    if (this.isDashing) {
      // Keep applying dash velocity during dash
      this.player.setVelocity(this.dashDirection.x, this.dashDirection.y);
    }
  }

  getDashProgress() {
    if (this.canDash) return 1;
    const timeSinceDash = this.scene.time.now - this.lastDashTime;
    return Math.min(timeSinceDash / CONSTANTS.dashCooldown, 1);
  }
} 