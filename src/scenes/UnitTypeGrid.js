import unitTypes from '../entities/unitTypes.js';

export function createUnitTypeGrid(scene, width, height) {
    const teamColors = [0xFF8B8B, 0x7575FF]; // Use the same colors as in initializeTeams
    const gridContainer = scene.add.container(0, height - 200);
    const borderSize = 2;
    const imageSize = 100; // Assuming the image size is 100x100 after scaling

    teamColors.forEach((color, rowIndex) => {
      unitTypes.forEach(({ key, graphic }, colIndex) => {
        const x = colIndex * imageSize + 50;
        const y = rowIndex * imageSize + 50;
        const imageKey = graphic;

        // Draw border
        const graphics = scene.add.graphics();
        graphics.lineStyle(borderSize, 0x000000, 1);
        graphics.strokeRect(x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
        gridContainer.add(graphics);

        // Add unit image
        const unitImage = scene.add.image(x, y, imageKey).setScale(2);
        unitImage.setInteractive({ draggable: true });
        unitImage.on('dragstart', (pointer, dragX, dragY) => {
          unitImage.setAlpha(0.5);
        });
        unitImage.on('drag', (pointer, dragX, dragY) => {
          unitImage.x = dragX;
          unitImage.y = dragY;
        });
        unitImage.on('dragend', (pointer, dragX, dragY) => {
          unitImage.setAlpha(1);
          const dropX = pointer.worldX;
          const dropY = pointer.worldY;
          const team = { color, side: rowIndex === 0 ? 'top' : 'bottom', group: rowIndex === 0 ? scene.topGroup : scene.bottomGroup };
          scene.spawnUnit(key, team, dropX, dropY);
          unitImage.x = x; // Reset position
          unitImage.y = y;
        });
        gridContainer.add(unitImage);
      });
    });
} 