import Unit from './Unit.js';

class Healer extends Unit {
  constructor(scene, team, x, y) {
    super(scene, team, 'healer', x, y);
  }

  // Add any specific methods or overrides for Healer here
}

export default Healer; 
