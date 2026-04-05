# emergent systems.

Interactive explorations of self-organizing computation.

---

## Demos

| # | Demo | Description |
|---|------|-------------|
| 01 | **DiffLogic Cellular Automata** | Draw target patterns and watch a genetic algorithm learn the local rules that produce them. Run learned rules at any grid scale. |
| 02 | **Reaction-Diffusion** | Gray-Scott reaction-diffusion with user-deformable surface. Drag to warp local diffusion rates and watch Turing patterns respond. |
| 03 | **Flow-Lenia** | Multi-species continuous cellular automaton with mass conservation. Place organisms and watch emergent competition, coexistence, and evolution. |
| 04 | **Physarum Transport Networks** | Agent-based slime mold simulation as a collaborative drawing tool. Place food sources, draw trails, and watch organic network structures emerge. |

## Running

No build step required. Serve the project root with any static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .

# VS Code
# Use the Live Server extension
```

Then open `http://localhost:8000` in a modern browser.

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for planned future demos:
- Primordial Particle Systems
- MergeLife (evolved aesthetic CA)
- Neural Cellular Automata for Morphogenesis

## References

- [DiffLogic CA](https://google-research.github.io/self-organising-systems/difflogic-ca/) — Google Research, 2025
- [Flow-Lenia](https://arxiv.org/abs/2506.08569) — Plantec et al., 2025
- [Turing Patterns on Curved Surfaces](https://arxiv.org/abs/2403.09247) — 2024
- [Physarum Simulation](https://sagejenson.com/physarum) — Jones (2010), Sage Jensen
- [Lenia](https://chakazul.github.io/lenia.html) — Continuous Game of Life
