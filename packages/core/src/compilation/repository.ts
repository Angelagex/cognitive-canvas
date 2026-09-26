import { CompilationEntity } from "./entity";

export type CreateCompilationInput = {
  id: string;
  canvasId: string;
  feedbackCritique: string;
  linearThinkingRisk: boolean;
  crossLinkDensityScore: number;
  rawOutputJson: string;
};

export type UpdateCompilationInput = Partial<Omit<CreateCompilationInput, "id">>;

export class CompilationRepository {
  static async create(data: CreateCompilationInput) {
    return CompilationEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await (CompilationEntity as any).get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async listByCanvas(canvasId: string) {
    const result = await (CompilationEntity as any).query.byCanvas({ canvasId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async update(id: string, data: UpdateCompilationInput) {
    return (CompilationEntity as any).update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return (CompilationEntity as any).update({ id }).set({ deletedAt: Date.now() }).go();
  }
}
