import { create } from 'zustand';

interface AppState {
  rustResult: number | null;
  jsResult: number | null;
  rustTime: number | null;
  jsTime: number | null;
  setRustResult: (val: number, time: number) => void;
  setJsResult: (val: number, time: number) => void;
}

export const useStore = create<AppState>((set) => ({
  rustResult: null,
  jsResult: null,
  rustTime: null,
  jsTime: null,
  setRustResult: (val, time) => set({ rustResult: val, rustTime: time }),
  setJsResult: (val, time) => set({ jsResult: val, jsTime: time }),
}));
