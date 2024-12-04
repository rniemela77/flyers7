import { CONSTANTS } from "../constants";

export default class DamageNumber {
  constructor(scene) {
    this.scene = scene;
    this.activeNumbers = [];
  }

  create(x, y, damage, healthBar, isCrit) {
    // Create the text at the initial position
    const text = this.scene.add.text(
      x - 20,
      y - 15, // Just below the health bar
      `-${Math.round(damage)}`, 
      {
        fontFamily: 'Arial',
        fontSize: isCrit ? '20px' : '16px',
        fontStyle: 'bold',
        color: isCrit ? '#FFCC00' : '#ff0000'
      }
    );
    text.setDepth(100);
    text.setOrigin(0, 0.5);

    // Store reference with the same offset
    const numberInfo = {
      text,
      healthBar,
      xOffset: x - healthBar.background.x + 10,
      yOffset: -35 
    };
    this.activeNumbers.push(numberInfo);

    // Float up from the offset position
    this.scene.tweens.add({
      targets: text,
      y: y - 15, // Reduced from -30 to -15 for shorter float distance
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy();
        this.activeNumbers = this.activeNumbers.filter(n => n.text !== text);
      }
    });
  }

  update() {
    // Update position of all active numbers relative to their health bars
    for (const numberInfo of this.activeNumbers) {
      if (numberInfo.text.active && numberInfo.healthBar.background.active) {
        numberInfo.text.x = numberInfo.healthBar.background.x + numberInfo.xOffset;
        numberInfo.text.y = numberInfo.healthBar.background.y + numberInfo.yOffset;
      }
    }
  }

  destroy() {
    for (const numberInfo of this.activeNumbers) {
      if (numberInfo.text.active) {
        numberInfo.text.destroy();
      }
    }
    this.activeNumbers = [];
  }
} 