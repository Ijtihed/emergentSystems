# emergent systems.

Interactive explorations of self-organizing computation.

## All demos (quick links)

1. [DiffLogic Cellular Automata](difflogic-ca/index.html)
2. [Reaction-Diffusion](reaction-diffusion/index.html)
3. [Physarum Transport Networks](physarum/index.html)
4. [Abelian Sandpile](sandpile/index.html)
5. [Primordial Particle Systems](primordial-particles/index.html)
6. [Paterson's Worms](paterson-worms/index.html)
7. [Swarm Chemistry](swarm-chemistry/index.html)
8. [Diffusion-Limited Aggregation](dla/index.html)
9. [Turmite Ecosystems](turmite-ecosystems/index.html)
10. [Multiple Neighborhood Cellular Automata](mnca/index.html)
11. [Multi-Scale Turing Patterns](turing-patterns/index.html)
12. [Turmites](turmites/index.html)
13. [Particle Life](particle-life/index.html)
14. [Cyclic Cellular Automata](cyclic-ca/index.html)
15. [Non-Reciprocal Flocking](flocking/index.html)
16. [Dielectric Breakdown Model](dielectric-breakdown/index.html)
17. [Langton's Self-Reproducing Loops](langton-loops/index.html)
18. [Competitive Multi-Seed Growth](multi-seed-growth/index.html)

## Demo catalog

| # | Demo | What it explores |
|---|------|------------------|
| 01 | [DiffLogic Cellular Automata](difflogic-ca/index.html) | Reverse-engineering CA rules with a browser-native differentiable-logic-inspired workflow. |
| 02 | [Reaction-Diffusion](reaction-diffusion/index.html) | Gray-Scott morphogenesis with user-deformed local dynamics. |
| 03 | [Physarum Transport Networks](physarum/index.html) | Multi-agent slime mold transport network formation. |
| 04 | [Abelian Sandpile](sandpile/index.html) | Self-organized criticality and avalanche cascades on a lattice. |
| 05 | [Primordial Particle Systems](primordial-particles/index.html) | Membrane-like particle collectives and proto-cell behavior. |
| 06 | [Paterson's Worms](paterson-worms/index.html) | Triangular-lattice worm dynamics and snowflake-like motifs. |
| 07 | [Swarm Chemistry](swarm-chemistry/index.html) | Evolutionary swarms that form species-like collective behavior. |
| 08 | [Diffusion-Limited Aggregation](dla/index.html) | Fractal branching from random-walker accretion. |
| 09 | [Turmite Ecosystems](turmite-ecosystems/index.html) | Competing turmite species and territorial pattern wars. |
| 10 | [Multiple Neighborhood Cellular Automata](mnca/index.html) | Rich CA behavior from concentric neighborhood rules. |
| 11 | [Multi-Scale Turing Patterns](turing-patterns/index.html) | Pattern formation from competing activator-inhibitor scales. |
| 12 | [Turmites](turmites/index.html) | 2D Turing-machine-like agents generating highways and spirals. |
| 13 | [Particle Life](particle-life/index.html) | Ecosystem-like structures from a pairwise interaction matrix. |
| 14 | [Cyclic Cellular Automata](cyclic-ca/index.html) | Spiral waves from cyclic N-species local replacement rules. |
| 15 | [Non-Reciprocal Flocking](flocking/index.html) | Run-and-chase active matter from asymmetric coupling. |
| 16 | [Dielectric Breakdown Model](dielectric-breakdown/index.html) | Lightning-like fractals from Laplacian growth with eta control. |
| 17 | [Langton's Self-Reproducing Loops](langton-loops/index.html) | Rule-based self-replication in an 8-state CA. |
| 18 | [Competitive Multi-Seed Growth](multi-seed-growth/index.html) | Multi-origin Eden/percolation growth and fractal boundaries. |

## Device support

- Desktop/laptop is required to run simulations.
- Mobile and tablet are preview-only and redirected to the landing page.
- This policy is enforced by shared `device-gate.js` across the landing page and every demo page.

## Running locally

No build step is required. Serve the project root with any static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

## References

- Turing, Alan (1952). [The Chemical Basis of Morphogenesis](https://royalsocietypublishing.org/doi/10.1098/rstb.1952.0012).
- Gray, P. and Scott, S. (1983). Autocatalytic reactions in an isothermal CSTR.
- Jones, Jeff (2010). [Characteristics of pattern formation and evolution in approximations of Physarum transport networks](https://direct.mit.edu/artl/article-abstract/16/2/127/2327/Characteristics-of-Pattern-Formation-and-Evolution).
- Miotti, Niklasson, Randazzo, Mordvintsev (2025). [Differentiable Logic Cellular Automata](https://google-research.github.io/self-organising-systems/difflogic-ca/) ([arXiv:2506.04912](https://arxiv.org/abs/2506.04912)).
- Greenberg, J. and Hastings, S. (1978). Spatial patterns for discrete models of diffusion.
- Fisch, Gravner, Griffeath (1991). Cyclic cellular automata and spiral wave behavior.
- Chatterjee et al. (2025). [Emergent complex phases in a discrete flocking model](https://www.nature.com/articles/s42005-025-02098-x).
- Niemeyer, Pietronero, Wiesmann (1984). Fractal dimension of dielectric breakdown.
- Langton, Christopher (1984). Self-reproduction in cellular automata.
- Eden, Murray (1961). Two-dimensional growth process.
- Wilkinson and Willemsen (1983). [Invasion percolation](https://en.wikipedia.org/wiki/Invasion_percolation).
- [Curvature-driven pattern dynamics](https://arxiv.org/abs/2403.09247) (2024).

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for upcoming demos and expansion areas.
