import PlayerWhiteAttack from './PlayerWhiteAttack';

export default class PlayerAttackManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.attacks = this.initializeAttacks();
  }

  initializeAttacks() {
    return {
      whiteAttack: new PlayerWhiteAttack(this.scene, this.player)
    };
  }

  performWhiteAttack(targetPosition) {
    return this.attacks.whiteAttack.performAttack(targetPosition);
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