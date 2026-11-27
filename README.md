# TURKEY RUN

[![Competition](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Rank](https://make.fun/badge/turkey-run-game-01/claymoreth/turkey-run-game-entry/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Reward](https://make.fun/badge/turkey-run-game-01/claymoreth/turkey-run-game-entry/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

One turkey, one very angry farmer, and 1400 metres of farmyard, barn, and kitchen between the bird and Thanksgiving dinner. TURKEY RUN is a 2D canvas auto-runner: the turkey sprints right on its own while the farmer chases from behind — jump fences and hay bales, slide under low beams, time the swinging carving knives, dodge oven fire jets and falling knives, grab corn, golden feathers, and pie, and reach the forest gate before the farmer serves dinner.

## How to play

- **Jump:** Space / ArrowUp / W, or click / tap. Release early for a shorter hop.
- **Panic flap:** hold jump while falling to slow your descent for precise landings.
- **Slide:** hold ArrowDown / S to duck under low beams.
- **Pause:** P — **Mute:** M — **Restart:** R.
- You have 3 lives. The farmer touching you costs one life and knocks you forward; at 0 lives the screen reads DINNER IS SERVED. Reach the forest gate at 1400 m to escape.

## Run locally

```bash
node serve.ts
# then open http://127.0.0.1:8080
```

or with Python:

```bash
python3 -m http.server 8080 --directory game
```

## License

MIT — see [LICENSE](LICENSE).
