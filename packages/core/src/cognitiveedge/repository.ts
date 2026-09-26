import { CognitiveEdgeEntity } from "./entity";

export type CreateCognitiveEdgeInput = {
  id: string;
  canvasId: string;
  compilationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  isCrossLink: boolean;
  relationNature: string;
};

export type UpdateCognitiveEdgeInput = Partial<Omit<CreateCognitiveEdgeInput, "id">>;

export class CognitiveEdgeRepository {
  static async create(data: CreateCognitiveEdgeInput) {
    return CognitiveEdgeEntity.create(data).go();
  }

  static async batchCreate(edges: CreateCognitiveEdgeInput[]) {
    return CognitiveEdgeEntity.put(edges).go();
  }

  static async get(id: string) {
    const result = await (CognitiveEdgeEntity as any).get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async listByCompilation(compilationId: string) {
    const result = await (CognitiveEdgeEntity as any).query.byCompilation({ compilationId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async update(id: string, data: UpdateCognitiveEdgeInput) {
    return (CognitiveEdgeEntity as any).update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return (CognitiveEdgeEntity as any).update({ id }).set({ deletedAt: Date.now() }).go();
  }
}
