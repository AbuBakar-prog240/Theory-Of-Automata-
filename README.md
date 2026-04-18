# VASim++: Visual Automata Simulator

VASim++ is an educational full-stack style web app (frontend + in-browser simulation logic) for learning Theory of Automata and Formal Languages (TAFL). It lets students design and execute automata visually with interactive debugging.

## Supported Models

- Deterministic Finite Automata (DFA)
- Non-Deterministic Finite Automata (NFA) with epsilon transitions
- Pushdown Automata (PDA) with stack read/write operations
- Turing Machines (TM) with tape read/write and head movement

## Tech Stack

- React + TypeScript (Vite)
- React Flow for visual graph editing (state and transition diagram)
- Tailwind CSS for responsive UI styling
- Pure TypeScript simulation engine (no external server)

## Features

- Interactive canvas to add, move, and connect states
- Mark states as start/accept from the state panel
- Editable transition table, including model-specific fields
- String simulation with:
  - Run
  - Play/Pause
  - Next step
  - Reset
- Batch input testing (newline/comma separated inputs)
- Step-by-step debug output:
  - Current active state(s)
  - Stack snapshot for PDA
  - Tape + head position for TM
- Undo/redo for editor actions (buttons + Ctrl/Cmd+Z, Ctrl/Cmd+Y)
- Transition row delete action in table
- Save automata as JSON
- Load automata from JSON
- Export diagram as PNG
- Built-in templates for all four models
- Validation messages for common configuration errors

## Project Structure

- `src/App.tsx` - top-level app orchestration and UI composition
- `src/components/` - canvas, sidebar, transition table, and controls
- `src/engine/simulator.ts` - DFA/NFA/PDA/TM execution logic
- `src/data/templates.ts` - example automata templates
- `src/utils/serialization.ts` - JSON save/load and PNG export helpers
- `src/types.ts` - shared type definitions

## Setup

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Build production bundle:
   - `npm run build`
4. Preview production build:
   - `npm run preview`

## Usage

1. Choose a model from the left sidebar.
2. Add/remove states and drag them on the canvas.
3. Connect states using the React Flow connector.
4. Edit transition labels in the transition table.
5. Mark start/accept states from the state cards.
6. Enter an input string and press Run.
7. Use Play/Next for debugging the step sequence.

## Transition Format Notes

- DFA/NFA: transition uses `input`
- NFA epsilon transition: use `ε`
- PDA transition: `input`, `stackRead`, `stackWrite`
- TM transition: `tapeRead`, `tapeWrite`, and `move` (`L`, `R`, `S`)

## Example Inputs

- `DFA - Ends with 1`
  - Accepts: `101`, `11`
  - Rejects: `100`
- `NFA - Contains ab`
  - Accepts: `ab`, `baab`
- `PDA - a^n b^n`
  - Try: `aaabbb`
- `TM - Replace 1 with X`
  - Try: `1011`

## Educational Notes

The simulator is intentionally transparent: each algorithm emits a history of configurations so students can observe machine evolution over time, rather than only seeing a final accept/reject result.

## Future Improvements

- Undo/redo operations in the editor
- Better PDA acceptance modes (by empty stack vs final state)
- Multi-tape TM support
- Automatic layout of large automata graphs
