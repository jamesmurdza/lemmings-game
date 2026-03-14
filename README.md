# Lemmings JS

A simple JavaScript implementation of the classic Lemmings game using HTML5 Canvas.

## How to Play

Guide the lemmings from the entrance (top-left) to the exit (bottom-right)!

### Controls

Select a tool and click on a lemming to assign it:

| Tool | Key | Description |
|------|-----|-------------|
| Select | S | Clear tool selection |
| Blocker | B | Lemming stops and blocks others |
| Digger | D | Lemming digs downward |
| Builder | U | Lemming builds stairs |
| Basher | A | Lemming digs horizontally |
| Umbrella | M | Lemming survives long falls |
| Restart | R | Restart the game |

### Objective

Save at least 50% of the lemmings (8 out of 15) to win!

## Running the Game

```bash
npm start
```

Then open http://localhost:3000 in your browser.

## Features

- Classic Lemmings gameplay mechanics
- 5 different tools: Blocker, Digger, Builder, Basher, Umbrella
- Physics-based falling with fall damage
- Terrain modification (digging and building)
- Keyboard shortcuts for all tools