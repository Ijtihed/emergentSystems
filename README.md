# emergent systems.

Interactive explorations of self-organizing computation.

## Demos

| # | Demo | Description |
|---|------|-------------|
| 01 | [Particle Life](particle-life/index.html) | Emergent ecosystems from a pairwise force matrix. Ventrella 2005, brainxyz 2022. |
| 02 | [Turmite Ecosystems](turmite-ecosystems/index.html) | Multiple turmite species competing for territory on a shared grid. |
| 03 | [Primordial Particles](primordial-particles/index.html) | Cell membranes and mitosis from one equation. Schmickl et al. 2016. |
| 04 | [Swarm Chemistry](swarm-chemistry/index.html) | Breed alien lifeforms via multi-species Boids evolution. Sayama 2009. |
| 05 | [Turmites](turmites/index.html) | 2D Turing machines building highways, spirals, and fractals. Langton 1986. |
| 06 | [MNCA](mnca/index.html) | Amoebas and solitons from concentric ring neighborhood rules. Slackermanz 2014. |
| 07 | [Multi-Scale Turing Patterns](turing-patterns/index.html) | Alien surfaces from competing activator-inhibitor blur scales. McCabe 2010. |
| 08 | [Paterson's Worms](paterson-worms/index.html) | Hexagonal snowflakes on a triangular lattice. Paterson-Conway 1971. |
| 09 | [DLA](dla/index.html) | Lightning and frost fractals from random walkers. Witten-Sander 1981. |
| 10 | [Physarum](physarum/index.html) | Slime mold transport networks. Jones 2010. |
| 11 | [Abelian Sandpile](sandpile/index.html) | Fractal mandalas from self-organized criticality. Bak-Tang-Wiesenfeld 1987. |
| 12 | [Reaction-Diffusion](reaction-diffusion/index.html) | Gray-Scott with spatial f/k painting. Turing 1952, Gray-Scott 1983. |
| 13 | [DiffLogic CA](difflogic-ca/index.html) | Evolve rules from target patterns. Inspired by Miotti et al. 2025. |
| 14 | [Cyclic CA](cyclic-ca/index.html) | Psychedelic spiral wars from N-species cycles. Greenberg-Hastings 1978. |
| 15 | [Non-Reciprocal Flocking](flocking/index.html) | Run-and-chase dynamics from asymmetric alignment. Chatterjee et al. 2025. |
| 16 | [Dielectric Breakdown](dielectric-breakdown/index.html) | Lightning fractals from Laplace field growth. Niemeyer et al. 1984. |
| 17 | [Langton's Loops](langton-loops/index.html) | Self-reproducing pixel organisms. Langton 1984. |
| 18 | [Multi-Seed Growth](multi-seed-growth/index.html) | Competing crystals with fractal borders. Eden 1961, Wilkinson-Willemsen 1983. |
| 19 | [Neural Particle Automata](neural-particles/index.html) | Particles with learned self-organizing rules. Zhu et al. 2026. |
| 20 | [Particle Life++](particle-life-plus/index.html) | ASAL-discovered open-ended ecosystems. Sakana AI 2024. |
| 21 | [Evolving GoL](het-gol/index.html) | Per-cell rules that mutate and compete. Plantec et al. 2024. |
| 22 | [Evoloops](evoloops/index.html) | Self-reproducing loops with Darwinian evolution. Sayama 1999. |
| 23 | [Computational Life](computational-life/index.html) | Self-replicators emerging from random programs. Aguera y Arcas et al. 2024. |

## Running locally

No build step required. Serve the project root with any static server.

```bash
npx http-server -p 3000 -c-1
```

Then open http://localhost:3000.

## References

- Ventrella, Jeffrey (2005). Clusters.
- Langton, Chris (1986). Langton's Ant.
- Schmickl et al. (2016). How a life-like system emerges from a simple particle motion law. Scientific Reports.
- Sayama, Hiroki (2009). Swarm Chemistry. Artificial Life 15(1).
- Slackermanz (2014). Multiple Neighborhood Cellular Automata.
- McCabe, Jonathan (2010). Cyclic Symmetric Multi-Scale Turing Patterns. Bridges.
- Paterson, Mike and Conway, John (1971). Paterson's Worms.
- Witten and Sander (1981). Diffusion-Limited Aggregation.
- Jones, Jeff (2010). Physarum Transport Networks. Artificial Life.
- Bak, Tang, Wiesenfeld (1987). Self-Organized Criticality.
- Turing, Alan (1952). The Chemical Basis of Morphogenesis.
- Gray and Scott (1983). Autocatalytic reactions in an isothermal CSTR.
- Miotti, Niklasson, Randazzo, Mordvintsev (2025). Differentiable Logic Cellular Automata. Google.
- Greenberg and Hastings (1978). Spatial patterns for discrete models of diffusion.
- Chatterjee et al. (2025). Emergent complex phases in a discrete flocking model. Communications Physics.
- Niemeyer, Pietronero, Wiesmann (1984). Fractal dimension of dielectric breakdown.
- Langton, Christopher (1984). Self-reproduction in cellular automata.
- Eden, Murray (1961). Two-dimensional growth process.
- Wilkinson and Willemsen (1983). Invasion percolation.
- Zhu et al. (2026). Neural Particle Automata. arXiv:2601.16096.
- Sakana AI (2024). ASAL, Automating the Search for Artificial Life.
- Plantec et al. (2024). Evolving Game of Life. arXiv:2406.13383.
- Sayama, Hiroki (1999). Evoloops.
- Aguera y Arcas et al. (2024). Computational Life. arXiv:2406.19108.
