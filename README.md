# Operation Black Pine

A browser-based single-player tactical FPS mission built with HTML, CSS, JavaScript, and Three.js.

## Concept

You are assaulting an isolated modern military safehouse hidden inside a forest compound. Fight through layered defenders, breach the house, plant a charge in the intelligence room, then survive the post-plant counterattack until detonation.

## Features

- First-person pointer lock controls
- Assault rifle and pistol
- Limited ammo and reloads
- Health, armor, medkits, ammo pickups
- 3-floor safehouse:
  - basement
  - main floor
  - top floor
- Bomb hardpoint objective
- Planting progress system
- Defenders with basic tactical state behavior
- Reinforcements after plant
- Enemy defuse attempts
- Victory / defeat states
- Pause menu and mission brief
- Modular JS architecture for expansion

## Folder Structure

```text
tactical-safehouse-fps/
  index.html
  style.css
  README.md
  js/
    main.js
    map.js
    player.js
    weapon.js
    ai.js
    objective.js
    ui.js
    audio.js
