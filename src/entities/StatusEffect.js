const freezeConfig = {
  targetType: 'enemies', // Options: 'enemies', 'allies', 'both'
  radius: 100,
  duration: 3000,
  circleColor: 0x00ffff // Color for the radius indicator
};

const shieldConfig = {
  targetType: 'allies', // Options: 'enemies', 'allies', 'both'
  radius: 100,
  duration: 3000,
  circleColor: 0x00ff00 // Color for the radius indicator
};

function applyShieldEffect(unit) {
  unit.originalDamage = unit.damage;
  unit.damage *= 0.5; // Reduce damage by 50%
}

function removeShieldEffect(unit) {
  unit.damage = unit.originalDamage; // Restore original damage
}

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

// Create a new StatusEffect instance for the shield spell
const shieldEffect = new StatusEffect('shield', shieldConfig, applyShieldEffect, removeShieldEffect);

export { StatusEffect, freezeConfig, shieldConfig, shieldEffect }; 