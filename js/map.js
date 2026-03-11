import * as THREE from "../vendor/three.module.js";

function addBox(scene, x, y, z, w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.8,
      metalness: opts.metalness ?? 0.05
    })
  );
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = !!opts.castShadow;
  scene.add(mesh);
  return mesh;
}

function pushCollider(colliders, x, z, w, d, level) {
  colliders.push({
    min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
    max: new THREE.Vector3(x + w / 2, 0, z + d / 2),
    level
  });
}

export function buildMap(scene) {
  const levelHeights = {
    0: -4,
    1: 0,
    2: 6
  };

  const map = {
    colliders: [],
    obstacleMeshes: [],
    pickups: [],
    transferLinks: [],
    enemySpawns: [],
    reinforcementSpawns: [],
    playerSpawn: new THREE.Vector3(-54, levelHeights[1], 36),
    bombSite: {
      position: new THREE.Vector3(6, levelHeights[1], -1),
      level: 1,
      radius: 2.2
    },
    levelHeights
  };

  const floorY = map.levelHeights;

  const ground = addBox(scene, 0, -1.5, 0, 220, 1, 220, 0x43503d, { roughness: 1 });
  ground.receiveShadow = true;

  addBox(scene, -25, -1.0, 28, 84, 0.2, 10, 0x66625e, { roughness: 1 }).rotation.y = -0.18;

  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 });
  const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x264a2e, roughness: 1 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d7278, roughness: 1 });

  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - 0.5) * 190;
    const z = (Math.random() - 0.5) * 190;
    if (Math.abs(x) < 30 && Math.abs(z) < 24) continue;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 5.2, 8),
      treeTrunkMat
    );
    trunk.position.set(x, 1.1, z);
    trunk.castShadow = true;
    scene.add(trunk);
    map.obstacleMeshes.push(trunk);

    map.colliders.push({
      min: new THREE.Vector3(x - 0.75, 0, z - 0.75),
      max: new THREE.Vector3(x + 0.75, 0, z + 0.75)
    });

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 5.6, 8),
      treeLeavesMat
    );
    crown.position.set(x, 5.9, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  for (let i = 0; i < 18; i++) {
    const x = -70 + Math.random() * 140;
    const z = -70 + Math.random() * 140;

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1 + Math.random() * 1.3),
      rockMat
    );
    rock.scale.set(1.4, 0.9, 1.1);
    rock.position.set(x, -0.1, z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    map.obstacleMeshes.push(rock);

    map.colliders.push({
      min: new THREE.Vector3(x - 1.8, 0, z - 1.8),
      max: new THREE.Vector3(x + 1.8, 0, z + 1.8)
    });
  }

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x747f86,
    roughness: 0.9,
    metalness: 0.2
  });

  const fenceSegments = [
    { x: 0, z: -30, w: 70, d: 1.2 },
    { x: 0, z: 30, w: 70, d: 1.2 },
    { x: -35, z: 0, w: 1.2, d: 60 },
    { x: 35, z: 0, w: 1.2, d: 60 }
  ];

  for (const seg of fenceSegments) {
    const mesh = addBox(scene, seg.x, 1.4, seg.z, seg.w, 2.8, seg.d, 0x79828a, {
      roughness: 1
    });
    mesh.material = fenceMat;
    map.obstacleMeshes.push(mesh);

    const skipFrontGate = seg.z === 30 && seg.w === 70;
    const skipSideBreach = seg.x === -35 && seg.d === 60;

    if (!skipFrontGate && !skipSideBreach) {
      pushCollider(map.colliders, seg.x, seg.z, seg.w, seg.d);
    } else {
      if (seg.z === 30) {
        pushCollider(map.colliders, -18, 30, 28, 1.2);
        pushCollider(map.colliders, 18, 30, 28, 1.2);
      }
      if (seg.x === -35) {
        pushCollider(map.colliders, -35, -17, 1.2, 22);
        pushCollider(map.colliders, -35, 14, 1.2, 24);
      }
    }
  }

  const courtyardProps = [
    { x: -18, z: 7, w: 4, h: 2, d: 2.4, c: 0x52606b },
    { x: -10, z: -6, w: 5, h: 1.4, d: 2.2, c: 0x7e7769 },
    { x: 18, z: 6, w: 4.2, h: 2.2, d: 2.1, c: 0x4d5965 },
    { x: 23, z: -7, w: 3.2, h: 1.5, d: 2.6, c: 0x6f725e },
    { x: 0, z: 13, w: 7.5, h: 1.6, d: 2.3, c: 0x7a6c59 },
    { x: -22, z: 15, w: 5.5, h: 1.2, d: 1.5, c: 0x90886d }
  ];

  for (const p of courtyardProps) {
    const mesh = addBox(scene, p.x, p.h / 2, p.z, p.w, p.h, p.d, p.c, { castShadow: true });
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, p.x, p.z, p.w, p.d);
  }

  const shedBody = addBox(scene, 26, 2.2, 18, 8, 4.4, 7, 0x52616e);
  const shedRoof = addBox(scene, 26, 4.9, 18, 9, 1.2, 8, 0x2f3841);
  map.obstacleMeshes.push(shedBody, shedRoof);
  pushCollider(map.colliders, 26, 18, 8, 7);

  const houseX = 0;
  const houseZ = 0;
  const houseW = 28;
  const houseD = 22;
  const wallThickness = 0.8;
  const storyHeight = 6;

  function addWall(level, x, z, w, d, color = 0x7d838b) {
    const y = floorY[level] + storyHeight / 2;
    const mesh = addBox(scene, x, y, z, w, storyHeight, d, color, { castShadow: true });
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, x, z, w, d, level);
  }

  addWall(1, houseX, houseZ - houseD / 2, houseW, wallThickness);
  addWall(1, houseX - houseW / 2, houseZ, wallThickness, houseD);
  addWall(1, houseX + houseW / 2, houseZ, wallThickness, houseD);
  addWall(1, -9, houseD / 2, 10, wallThickness);
  addWall(1, 9, houseD / 2, 10, wallThickness);

  addWall(2, houseX, houseZ - houseD / 2, houseW, wallThickness, 0x767d86);
  addWall(2, houseX - houseW / 2, houseZ, wallThickness, houseD, 0x767d86);
  addWall(2, houseX + houseW / 2, houseZ, wallThickness, houseD, 0x767d86);
  addWall(2, -9, houseD / 2, 10, wallThickness, 0x767d86);
  addWall(2, 9, houseD / 2, 10, wallThickness, 0x767d86);

  addWall(0, houseX, houseZ - houseD / 2, houseW, wallThickness, 0x67615c);
  addWall(0, houseX - houseW / 2, houseZ, wallThickness, houseD, 0x67615c);
  addWall(0, houseX + houseW / 2, houseZ, wallThickness, houseD, 0x67615c);
  addWall(0, houseX, houseZ + houseD / 2, houseW, wallThickness, 0x67615c);

  const mainFloorSlab = addBox(scene, houseX, floorY[1] - 0.4, houseZ, houseW, 0.8, houseD, 0x7d7b74, { roughness: 1 });
  const topFloorSlab = addBox(scene, houseX, floorY[2] - 0.4, houseZ, houseW, 0.8, houseD, 0x6f6c64, { roughness: 1 });
  const basementSlab = addBox(scene, houseX, floorY[0] - 0.4, houseZ, houseW, 0.8, houseD, 0x54514c, { roughness: 1 });
  const roof = addBox(scene, houseX, floorY[2] + storyHeight - 0.4, houseZ, houseW + 2, 0.8, houseD + 2, 0x3a4048, { roughness: 1 });
  map.obstacleMeshes.push(mainFloorSlab, topFloorSlab, basementSlab, roof);

  const bunkerShell = addBox(scene, -18, -1.2, -18, 6, 5.6, 8, 0x5f676f);
  const bunkerFloor = addBox(scene, -12, -4.4, -14, 8, 0.8, 4, 0x4f4d48);
  const tunnel = addBox(scene, -13.5, -1.8, -11, 1, 4.8, 6, 0x72756f);
  map.obstacleMeshes.push(bunkerShell, bunkerFloor, tunnel);
  pushCollider(map.colliders, -18, -18, 6, 8);

  addInteriorWallsMain(scene, map, floorY[1]);
  addInteriorWallsTop(scene, map, floorY[2]);
  addInteriorWallsBasement(scene, map, floorY[0]);
  addHouseProps(scene, map, floorY);
  addWindows(scene, floorY);

  map.transferLinks = [
    {
      fromLevel: 1,
      toLevel: 2,
      fromPos: new THREE.Vector3(-2.5, floorY[1], 7.5),
      toPos: new THREE.Vector3(-2.5, floorY[2], 7.5),
      label: "Use stairs to top floor"
    },
    {
      fromLevel: 2,
      toLevel: 1,
      fromPos: new THREE.Vector3(-2.5, floorY[2], 7.5),
      toPos: new THREE.Vector3(-2.5, floorY[1], 7.5),
      label: "Use stairs to main floor"
    },
    {
      fromLevel: 1,
      toLevel: 0,
      fromPos: new THREE.Vector3(10.5, floorY[1], -6),
      toPos: new THREE.Vector3(10.5, floorY[0], -6),
      label: "Use stairs to basement"
    },
    {
      fromLevel: 0,
      toLevel: 1,
      fromPos: new THREE.Vector3(10.5, floorY[0], -6),
      toPos: new THREE.Vector3(10.5, floorY[1], -6),
      label: "Use stairs to main floor"
    },
    {
      fromLevel: 0,
      toLevel: 1,
      fromPos: new THREE.Vector3(-11.5, floorY[0], -9.5),
      toPos: new THREE.Vector3(-16, floorY[1], -16),
      label: "Use exterior basement exit"
    },
    {
      fromLevel: 1,
      toLevel: 0,
      fromPos: new THREE.Vector3(-16, floorY[1], -16),
      toPos: new THREE.Vector3(-11.5, floorY[0], -9.5),
      label: "Use basement access"
    }
  ];

  map.pickups.push(
    { type: "ammo", amount: 1, level: 1, position: new THREE.Vector3(-9, floorY[1], 4) },
    { type: "medkit", amount: 28, level: 1, position: new THREE.Vector3(11, floorY[1], 8) },
    { type: "armor", amount: 30, level: 0, position: new THREE.Vector3(8.5, floorY[0], 3) },
    { type: "ammo", amount: 1, level: 2, position: new THREE.Vector3(8, floorY[2], -2) },
    { type: "medkit", amount: 24, level: 2, position: new THREE.Vector3(-9.5, floorY[2], 6) },
    { type: "armor", amount: 22, level: 1, position: new THREE.Vector3(-23, floorY[1], 17) }
  );

  for (const pickup of map.pickups) {
    const color =
      pickup.type === "ammo" ? 0xffd966 :
      pickup.type === "medkit" ? 0x7dffb0 :
      0x7dc8ff;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.5
      })
    );
    mesh.position.set(pickup.position.x, pickup.position.y + 0.35, pickup.position.z);
    scene.add(mesh);
    pickup.mesh = mesh;
  }

  map.enemySpawns = [
    {
      position: new THREE.Vector3(-28, floorY[1], 24),
      level: 1,
      role: "patrol",
      patrol: [
        new THREE.Vector3(-30, floorY[1], 22),
        new THREE.Vector3(-18, floorY[1], 18),
        new THREE.Vector3(-22, floorY[1], 6)
      ]
    },
    {
      position: new THREE.Vector3(18, floorY[1], 22),
      level: 1,
      role: "patrol",
      patrol: [
        new THREE.Vector3(21, floorY[1], 22),
        new THREE.Vector3(27, floorY[1], 8),
        new THREE.Vector3(16, floorY[1], -5)
      ]
    },
    {
      position: new THREE.Vector3(-20, floorY[1], -2),
      level: 1,
      role: "sentry"
    },
    {
      position: new THREE.Vector3(22, floorY[1], 6),
      level: 1,
      role: "sentry"
    },
    {
      position: new THREE.Vector3(0, floorY[2], 10),
      level: 2,
      role: "overwatch"
    },
    {
      position: new THREE.Vector3(-8.5, floorY[1], 1),
      level: 1,
      role: "interior"
    },
    {
      position: new THREE.Vector3(8.5, floorY[1], -2),
      level: 1,
      role: "interior"
    },
    {
      position: new THREE.Vector3(10, floorY[0], -1),
      level: 0,
      role: "bunker"
    },
    {
      position: new THREE.Vector3(-7, floorY[2], -3),
      level: 2,
      role: "interior"
    },
    {
      position: new THREE.Vector3(9, floorY[2], 4),
      level: 2,
      role: "interior"
    }
  ];

  map.reinforcementSpawns = [
    { position: new THREE.Vector3(-32, floorY[1], 28), level: 1, role: "reinforcement" },
    { position: new THREE.Vector3(32, floorY[1], 27), level: 1, role: "reinforcement" },
    { position: new THREE.Vector3(-40, floorY[1], -10), level: 1, role: "reinforcement" },
    { position: new THREE.Vector3(38, floorY[1], 8), level: 1, role: "reinforcement" }
  ];

  return map;
}

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

function addHouseProps(scene, map, floorY) {
  const props = [
    { x: -9, y: floorY[1] + 0.75, z: 7, w: 5.8, h: 1.5, d: 2.2, c: 0x5e6a74, level: 1 },
    { x: -4, y: floorY[1] + 0.55, z: 8.5, w: 2.2, h: 1.1, d: 1.2, c: 0x7b756a, level: 1 },
    { x: -11, y: floorY[1] + 0.9, z: 1, w: 2.2, h: 1.8, d: 1.6, c: 0x6c706e, level: 1 },

    { x: 0.4, y: floorY[1] + 0.8, z: -5.5, w: 3.2, h: 1.6, d: 1.4, c: 0x464f57, level: 1 },
    { x: -2, y: floorY[1] + 0.5, z: -8, w: 2.2, h: 1, d: 1.2, c: 0x7a7268, level: 1 },

    { x: 13, y: floorY[1] + 0.7, z: 8, w: 3.5, h: 1.4, d: 1.6, c: 0x757b82, level: 1 },
    { x: 13, y: floorY[1] + 0.7, z: 4.2, w: 3.5, h: 1.4, d: 1.6, c: 0x757b82, level: 1 },
    { x: 12.4, y: floorY[1] + 1.2, z: -4, w: 4.4, h: 2.4, d: 2, c: 0x5c6670, level: 1 },

    { x: -12, y: floorY[2] + 0.75, z: 7, w: 2.4, h: 1.5, d: 2, c: 0x58626f, level: 2 },
    { x: -11, y: floorY[2] + 0.5, z: -3.5, w: 3.2, h: 1, d: 1.4, c: 0x766d63, level: 2 },
    { x: 10.5, y: floorY[2] + 0.75, z: 7, w: 3.2, h: 1.5, d: 2.2, c: 0x58626f, level: 2 },
    { x: 10.5, y: floorY[2] + 0.7, z: -2, w: 2.5, h: 1.4, d: 1.8, c: 0x7f776d, level: 2 },

    { x: -12, y: floorY[0] + 0.8, z: 5.5, w: 2.5, h: 1.6, d: 2.2, c: 0x5f6468, level: 0 },
    { x: 11.5, y: floorY[0] + 0.9, z: 2, w: 3.4, h: 1.8, d: 2.2, c: 0x64605b, level: 0 },
    { x: 3.5, y: floorY[0] + 0.8, z: -6.2, w: 3.8, h: 1.6, d: 1.6, c: 0x717882, level: 0 }
  ];

  for (const p of props) {
    const mesh = addBox(scene, p.x, p.y, p.z, p.w, p.h, p.d, p.c, { castShadow: true });
    map.obstacleMeshes.push(mesh);
    pushCollider(map.colliders, p.x, p.z, p.w, p.d, p.level);
  }

  const bombPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.12, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf0c35c,
      emissive: 0x8b5d08,
      emissiveIntensity: 0.5,
      roughness: 0.35
    })
  );
  bombPad.position.set(map.bombSite.position.x, floorY[1] + 0.06, map.bombSite.position.z);
  scene.add(bombPad);

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10),
    new THREE.MeshStandardMaterial({
      color: 0x86cfff,
      emissive: 0x2a8fff,
      emissiveIntensity: 0.65
    })
  );
  marker.position.set(map.bombSite.position.x, floorY[1] + 1.1, map.bombSite.position.z);
  scene.add(marker);
}

function addWindows(scene, floorY) {
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa9d2ff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.3
  });

  const windows = [
    [-6, floorY[1] + 2.6, 11.55, 3.2, 2.2, 0.08],
    [7, floorY[1] + 2.6, 11.55, 3.2, 2.2, 0.08],
    [-13.55, floorY[1] + 2.6, 4, 0.08, 2.2, 3],
    [13.55, floorY[1] + 2.6, -4, 0.08, 2.2, 3],
    [-6, floorY[2] + 2.6, 11.55, 3.2, 2.2, 0.08],
    [7, floorY[2] + 2.6, 11.55, 3.2, 2.2, 0.08],
    [-13.55, floorY[2] + 2.6, -4, 0.08, 2.2, 3],
    [13.55, floorY[2] + 2.6, 4, 0.08, 2.2, 3]
  ];

  for (const [x, y, z, w, h, d] of windows) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
}
