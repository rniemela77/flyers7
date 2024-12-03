import { CONSTANTS } from "../constants";
import HealthBar from "../ui/HealthBar";
import DamageNumber from "../ui/DamageNumber";

export default class UIManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.damageNumber = new DamageNumber(scene);

    // Create health bar
    this.healthBar = new HealthBar(scene, {
      x: player.sprite.x,
      y: player.sprite.y - player.sprite.height/2 - CONSTANTS.healthBarOffset,
      width: CONSTANTS.healthBarWidth,
      height: CONSTANTS.healthBarHeight,
      foregroundColor: CONSTANTS.healthBarColor
    });

    // Create dash cooldown bar
    this.dashBar = new HealthBar(scene, {
      x: player.sprite.x,
      y: player.sprite.y - player.sprite.height/2 - CONSTANTS.healthBarOffset + CONSTANTS.healthBarHeight + 1,
      width: CONSTANTS.healthBarWidth,
      height: CONSTANTS.healthBarHeight,
      foregroundColor: CONSTANTS.dashCooldownBarColor
    });
  }

  update(healthPercentage, dashProgress) {
    this.updatePositions();
    this.updateBars(healthPercentage, dashProgress);
    this.damageNumber.update();
  }

  updatePositions() {
    const baseY = this.player.sprite.y - this.player.sprite.height/2 - CONSTANTS.healthBarOffset;
    
    // Update health bar position
    this.healthBar.setPosition(
      this.player.sprite.x,
      baseY
    );

    // Update dash cooldown bar position
    this.dashBar.setPosition(
      this.player.sprite.x,
      baseY + CONSTANTS.healthBarHeight + 1
    );
  }

  updateBars(healthPercentage, dashProgress) {
    this.healthBar.updatePercentage(healthPercentage);
    this.dashBar.updatePercentage(dashProgress);
  }

  showDamageNumber(damage) {
    // Get the left edge of health bar for X alignment
    const healthBarX = this.player.sprite.x - CONSTANTS.healthBarWidth/2;
    
    // Position WAY above the player, using the health bar's Y position as reference
    const healthBarY = this.player.sprite.y - this.player.sprite.height/2 - CONSTANTS.healthBarOffset;
    
    this.damageNumber.create(
      healthBarX,
      healthBarY,
      damage,
      this.healthBar
    );
  }

  destroy() {
    this.healthBar.destroy();
    this.dashBar.destroy();
  }
} 