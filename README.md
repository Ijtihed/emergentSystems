# emergent systems.

Building emergent-system experiences that are either not built yet, or not built deeply enough to be genuinely useful.

---

## Demos

The goal is not to re-skin known simulations. Each demo targets a gap where existing implementations are missing, shallow, or hard to explore interactively.

| # | Demo | Description |
|---|------|-------------|
| 01 | **DiffLogic Cellular Automata** | Inspired by Miotti et al. 2025 at Google. Instead of reproducing their training pipeline, this demo explores a browser-native evolutionary route to the same reverse-engineering problem, aiming to make the research question runnable by anyone, not just in a lab setup. |
| 02 | **Reaction-Diffusion** | Standard Gray-Scott model (Gray and Scott 1983) implementing Turing's reaction-diffusion morphogenesis. User-deformable surface modifies local diffusion rates, inspired by 2024 research on curvature-driven pattern dynamics. |
| 03 | **Flow-Lenia** | Implements Flow-Lenia (Plantec et al. ALIFE 2023 Best Paper, published 2025) extending Lenia (Chan 2018). Uses gradient-based flow advection for mass conservation. Three species with ring-shaped kernels and Gaussian growth functions compete in shared space. |
| 04 | **Physarum Transport Networks** | Implements the Jones 2010 multi-agent Physarum model with all four core parameters (sensor distance, sensor angle, rotation angle, move distance). Trail deposition, 3x3 mean diffusion, and multiplicative decay per the original paper. |

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

See [docs/roadmap.md](docs/roadmap.md) for planned future demos focused on underbuilt territory:
- Primordial Particle Systems
- MergeLife (evolved aesthetic CA)
- Neural Cellular Automata for Morphogenesis

## References

- Miotti, Niklasson, Randazzo, Mordvintsev. [Differentiable Logic CA](https://google-research.github.io/self-organising-systems/difflogic-ca/). Google Paradigms of Intelligence, March 2025. [arXiv:2506.04912](https://arxiv.org/abs/2506.04912)
- Plantec, Hamon, Etcheverry, Oudeyer, Moulin-Frier, Chan. [Flow-Lenia](https://sites.google.com/view/flowlenia/). Best Paper ALIFE 2023. [arXiv:2212.07906](https://arxiv.org/abs/2212.07906)
- Chan, Bert Wang-Chak. [Lenia](https://chakazul.github.io/lenia.html). Continuous Game of Life, 2018.
- Gray, Scott. Autocatalytic reactions in the isothermal, continuous stirred tank reactor. Chemical Engineering Science, 1983.
- Turing, Alan. The Chemical Basis of Morphogenesis. Philosophical Transactions of the Royal Society, 1952.
- Jones, Jeff. Characteristics of Pattern Formation and Evolution in Approximations of Physarum Transport Networks. Artificial Life, 2010.
- [Curvature-driven pattern dynamics](https://arxiv.org/abs/2403.09247). 2024.
