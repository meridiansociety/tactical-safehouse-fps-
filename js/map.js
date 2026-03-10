function addInteriorWallsMain(scene, map, y) {
  const wallColor = 0x83878d;
  const thickness = 0.6;
  const height = 6;

  const walls = [
    { x: 2.8, z: -6, w: 0.6, d: 9.5 },
    { x: -5.8, z: -6, w: 0.6, d: 9.5 },
    { x: -1.5, z: -10.5, w: 8.6, d: thickness },
    { x: 0, z: 2.8, w: 16, d: thickness },
    { x: 9.2, z: 2.8, w: 0.6, d: 17.2 },
    { x: -10.2, z: -2, w: 0.6, d: 8 },
    { x: -8, z: -5.8, w: 4.4, d: 0.6 }
  ];

  for (const wall of walls) {
    const mesh = addBox(scene, wall.x, y + 3, wall.z, wall.w, height, wall.d, wallColor);
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, wall.x, wall.z, wall.w, wall.d, 1);
  }
}

function addInteriorWallsTop(scene, map, y) {
  const wallColor = 0x7c8088;
  const height = 6;

  const walls = [
    { x: 0, z: 2.5, w: 20, d: 0.6 },
    { x: -8.5, z: -2.5, w: 0.6, d: 16 },
    { x: 8.5, z: -2.5, w: 0.6, d: 16 },
    { x: 0, z: -7.4, w: 16.5, d: 0.6 }
  ];

  for (const wall of walls) {
    const mesh = addBox(scene, wall.x, y + 3, wall.z, wall.w, height, wall.d, wallColor);
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, wall.x, wall.z, wall.w, wall.d, 2);
  }
}

function addInteriorWallsBasement(scene, map, y) {
  const wallColor = 0x66615d;
  const height = 6;

  const walls = [
    { x: 0, z: -1.5, w: 18, d: 0.6 },
    { x: -8.5, z: 4.5, w: 0.6, d: 11 },
    { x: 8.5, z: 3.5, w: 0.6, d: 13 },
    { x: -2, z: 7.5, w: 13, d: 0.6 }
  ];

  for (const wall of walls) {
    const mesh = addBox(scene, wall.x, y + 3, wall.z, wall.w, height, wall.d, wallColor);
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, wall.x, wall.z, wall.w, wall.d, 0);
  }
}
