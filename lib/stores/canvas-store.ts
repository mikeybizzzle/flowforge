import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  FlowNode, 
  FlowEdge, 
  NodeData, 
  ActivePanel, 
  ActiveView,
  CanvasViewport,
  Project 
} from '@/types';
import { generateId } from '@/lib/utils';

interface CanvasState {
  // Current project
  project: Project | null;
  setProject: (project: Project | null) => void;

  // Nodes and edges
  nodes: FlowNode[];
  edges: FlowEdge[];
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;

  // Node operations
  addNode: (node: Omit<FlowNode, 'id'>) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;

  // Edge operations
  addEdge: (edge: Omit<FlowEdge, 'id'>) => void;
  removeEdge: (id: string) => void;

  // Selection
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  setSelectedNode: (id: string | null) => void;
  setSelectedNodes: (ids: string[]) => void;

  // UI State
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;

  // Config dialog
  configDialogNodeId: string | null;
  setConfigDialogNodeId: (id: string | null) => void;

  // Viewport
  viewport: CanvasViewport;
  setViewport: (viewport: CanvasViewport) => void;

  // Context for AI
  getNodeContext: (nodeId: string) => NodeData[];
  getSelectedNodeData: () => NodeData | null;

  // Reset
  reset: () => void;
}

const initialState = {
  project: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  activeView: 'canvas' as ActiveView,
  activePanel: null,
  configDialogNodeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Project
      setProject: (project) => set({ project }),
      
      // Nodes and edges
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      
      // Node operations
      addNode: (node) => {
        const id = generateId();
        const newNode: FlowNode = { ...node, id };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
        return id;
      },
      
      updateNode: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id 
              ? { ...node, data: { ...node.data, ...data } as NodeData }
              : node
          ),
        }));
      },
      
      updateNodePosition: (id, position) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, position } : node
          ),
        }));
      },
      
      removeNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter(
            (edge) => edge.source !== id && edge.target !== id
          ),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
      },
      
      // Edge operations
      addEdge: (edge) => {
        const id = generateId();
        set((state) => ({ edges: [...state.edges, { ...edge, id }] }));
      },
      
      removeEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
        }));
      },
      
      // Selection
      setSelectedNode: (id) => set({ 
        selectedNodeId: id,
        selectedNodeIds: id ? [id] : [],
      }),
      
      setSelectedNodes: (ids) => set({ 
        selectedNodeIds: ids,
        selectedNodeId: ids.length === 1 ? ids[0] : null,
      }),
      
      // UI State
      setActiveView: (view) => set({ activeView: view }),
      setActivePanel: (panel) => set({ activePanel: panel }),

      // Config dialog
      setConfigDialogNodeId: (id) => set({ configDialogNodeId: id }),

      // Viewport
      setViewport: (viewport) => set({ viewport }),
      
      // Context for AI - get parent nodes for context
      getNodeContext: (nodeId) => {
        const { nodes, edges } = get();
        const contextIds = new Set<string>();
        
        // Walk up the graph to find parent context
        const findParents = (id: string, visited = new Set<string>()) => {
          if (visited.has(id)) return;
          visited.add(id);
          contextIds.add(id);
          
          edges.forEach((edge) => {
            if (edge.target === id) {
              findParents(edge.source, visited);
            }
          });
        };
        
        findParents(nodeId);
        
        return nodes
          .filter((n) => contextIds.has(n.id))
          .map((n) => n.data);
      },
      
      getSelectedNodeData: () => {
        const { nodes, selectedNodeId } = get();
        if (!selectedNodeId) return null;
        const node = nodes.find((n) => n.id === selectedNodeId);
        return node?.data || null;
      },
      
      // Reset
      reset: () => set(initialState),
    }),
    { name: 'canvas-store' }
  )
);

// Selectors for performance
export const selectNodes = (state: CanvasState) => state.nodes;
export const selectEdges = (state: CanvasState) => state.edges;
export const selectSelectedNodeId = (state: CanvasState) => state.selectedNodeId;
export const selectActiveView = (state: CanvasState) => state.activeView;
export const selectProject = (state: CanvasState) => state.project;
