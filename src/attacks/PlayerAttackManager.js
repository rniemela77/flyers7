import PlayerLineAttack from './PlayerLineAttack';

export default class PlayerAttackManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.attacks = this.initializeAttacks();
  }

  initializeAttacks() {
    return {
      lineAttack: new PlayerLineAttack(this.scene, this.player)
    };
  }

  performLineAttack(targetPosition) {
    return this.attacks.lineAttack.performAttack(targetPosition);
  }

  updateAttacks(offsetX, offsetY) {
    Object.values(this.attacks).forEach(attack => {
      attack.updatePosition(offsetX, offsetY);
    });
  }

  destroy() {
    Object.values(this.attacks).forEach(attack => {
      attack.destroy();
    });
  }
} 