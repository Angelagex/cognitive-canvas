import { CognitiveNodeEntity } from "./entity";

export type CreateCognitiveNodeInput = {
  id: string;
  canvasId: string;
  compilationId: string;
  pacerClassification: "PROCEDURAL" | "ANALOGOUS" | "CONCEPTUAL" | "EVIDENCE" | "REFERENCE";
  detectedContent: string;
  passiveContext?: string;
  boundingBoxJson: string;
  deducibleFromContext: boolean;
};

export type UpdateCognitiveNodeInput = Partial<Omit<CreateCognitiveNodeInput, "id">>;

export class CognitiveNodeRepository {
  static async create(data: CreateCognitiveNodeInput) {
    return CognitiveNodeEntity.create(data).go();
  }

  static async batchCreate(nodes: CreateCognitiveNodeInput[]) {
    return CognitiveNodeEntity.put(nodes).go();
  }

  static async get(id: string) {
    const result = await (CognitiveNodeEntity as any).get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async listByCompilation(compilationId: string) {
    const result = await (CognitiveNodeEntity as any).query.byCompilation({ compilationId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async listByCanvas(canvasId: string) {
    const result = await (CognitiveNodeEntity as any).query.byCanvas({ canvasId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async update(id: string, data: UpdateCognitiveNodeInput) {
    return (CognitiveNodeEntity as any).update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return (CognitiveNodeEntity as any).update({ id }).set({ deletedAt: Date.now() }).go();
  }
}
