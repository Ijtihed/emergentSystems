# Roadmap — Future Projects

Curated list of additional emergent systems worth building as interactive web demos.

---

## 5. Primordial Particle Systems
**Schmickl et al., Graz**

Systems where life-like behavior emerges from a trivial particle motion law. Each particle follows one rule about turning toward or away from neighbors, producing emergent cell-like structures, division, and motility.

- **Interactive angle**: Sliders for the turning rule parameters. Watch how slight changes cause phase transitions from gas → clustering → cell division → coordinated motility.
- **Implementation**: Agent-based, similar to Physarum but with angular momentum rules. ~5000 particles, Canvas 2D.
- **Status**: Published academically, no polished web version exists.
- **References**:
  - Schmickl et al., "How life-like behavior emerges from a simple particle motion law"
  - Related: swarm chemistry (Sayama)

---

## 6. MergeLife
**Jeff Heaton**

A genetic algorithm that evolves continuous CA producing full-color dynamic animations. Each cell is a 24-bit RGB color. The 16-byte update rule is evolved through an objective function requiring only initial human aesthetic guidelines.

Rules discovered so far exhibit spaceships, guns, oscillators, and even structures capable of Universal Turing Machine computation.

- **Interactive angle**: Let users define aesthetic preferences via sliders (symmetry, motion, color diversity, edge density) and watch the GA evolve beautiful CA rules in real-time. A "breeding" interface where users pick favorites from a grid.
- **Implementation**: Continuous CA on ~256×256 grid, population of rules, real-time fitness evaluation. WebGL recommended for rendering.
- **Status**: Basic web version exists at mergelife.org but is bare-bones. Opportunity for a much richer experience.
- **References**:
  - Heaton, "Evolving continuous cellular automata for aesthetic objectives"
  - mergelife.org
  - GitHub: jeffheaton/mergelife

---

## 7. Neural Cellular Automata for Morphogenesis
**Mordvintsev et al., Google**

The "Growing NCA" work where a CA learns to grow into a target image and self-repair when damaged. Each cell carries a hidden state vector; a small neural network (shared across all cells) determines how cells update based on their neighbors.

The 2025 extension demonstrates universal computation within NCA — the same architecture can implement arbitrary programs, not just pattern formation.

- **Interactive angle**: Upload any image, train an NCA on the fly (or use a pre-trained set), and interact by "damaging" the pattern and watching it regenerate. The 2025 universal computation extension opens possibilities for NCA that compute — e.g., an NCA that sorts colors or implements a counter.
- **Implementation**: Requires WebGL for the neural network forward pass per cell. Pre-trained models can be exported as weight tensors and run in a fragment shader.
- **Status**: Famous Distill article exists with limited interactivity. Full user-facing tool with upload + train + damage would be novel.
- **References**:
  - Mordvintsev et al., "Growing Neural Cellular Automata" (Distill, 2020)
  - arxiv.org/html/2505.13058v1 — Universal computation in NCA (2025)
  - distill.pub/2020/growing-ca/

---

## Priority Order

| # | Project | Effort | Visual Impact | Novelty |
|---|---------|--------|---------------|---------|
| 5 | Primordial Particles | Medium | High | High |
| 6 | MergeLife | Medium | Very High | Medium |
| 7 | Neural CA | High | Very High | Medium |

## Technical Notes

- All demos should maintain the same dark minimal aesthetic as the existing four.
- Prefer Canvas 2D or WebGL over DOM-based rendering for performance.
- Each demo should be fully self-contained (no build step, no external dependencies beyond Google Fonts).
- Target 30+ fps on modern hardware for all simulations.
- Consider Web Workers for compute-heavy operations (GA evolution, NCA forward pass).
