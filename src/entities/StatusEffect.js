const freezeConfig = {
  targetType: 'enemies', // Options: 'enemies', 'allies', 'both'
  radius: 100,
  duration: 3000,
  circleColor: 0x00ffff // Color for the radius indicator
};

class StatusEffect {
  constructor(type, config, applyEffect, removeEffect) {
    this.type = type;
    this.config = config;
    this.applyEffect = applyEffect;
    this.removeEffect = removeEffect;
  }

  apply(unit) {
    if (this.applyEffect) {
      this.applyEffect(unit);
    }
    unit.scene.time.delayedCall(this.config.duration, () => {
      if (this.removeEffect) {
        this.removeEffect(unit);
      }
    });
  }
}

export { StatusEffect, freezeConfig }; 