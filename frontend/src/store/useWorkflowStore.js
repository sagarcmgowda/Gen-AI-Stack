import { create } from 'zustand'
const initialNodes = [
  { id: 'user', type: 'stackNode', position: { x: 80, y: 200 }, data: { title: 'User Query', kind: 'user' } },
  { id: 'kb', type: 'stackNode', position: { x: 380, y: 120 }, data: { title: 'Knowledge Base', kind: 'kb' } },
  { id: 'llm', type: 'stackNode', position: { x: 680, y: 200 }, data: { title: 'LLM Engine', kind: 'llm' } },
  { id: 'out', type: 'stackNode', position: { x: 980, y: 200 }, data: { title: 'Output', kind: 'out' } },
]
const initialEdges = [
  { id: 'e1', source: 'user', target: 'llm', animated: true },
  { id: 'e2', source: 'kb', target: 'llm', animated: true },
  { id: 'e3', source: 'llm', target: 'out', animated: true },
]
export const useWorkflowStore = create((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selection: null,
  configs: {
    user: {},
    kb: { embeddingModel: 'openai', topK: 4 },
    llm: { provider: 'openai', temperature: 0.7, useWeb: false, prompt: 'You are a helpful assistant.' },
    out: {},
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelection: (sel) => set({ selection: sel }),
  updateConfig: (id, patch) => set({ configs: { ...get().configs, [id]: { ...get().configs[id], ...patch } } }),
  serialize: () => ({ nodes: get().nodes, edges: get().edges, configs: get().configs }),
}))