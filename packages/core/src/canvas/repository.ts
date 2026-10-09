import { CanvasEntity } from "./entity";

export type CreateCanvasInput = {
  id: string;
  name: string;
  s3Key?: string;
  status?: "DRAFT" | "COMPILING" | "COMPILED" | "FAILED";
  lastCompilationId?: string;
  crossLinkDensity?: number;
  linearThinkingRisk?: boolean;
};

export type UpdateCanvasInput = Partial<Omit<CreateCanvasInput, "id">>;

export class CanvasRepository {
  static async create(data: CreateCanvasInput) {
    return CanvasEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await CanvasEntity.get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async update(id: string, data: UpdateCanvasInput) {
    return CanvasEntity.update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return CanvasEntity.update({ id }).set({ deletedAt: Date.now() }).go();
  }

  static async list(limit = 10, cursor?: string) {
    return CanvasEntity.scan
      .where(({ deletedAt }, { notExists }) => notExists(deletedAt))
      .go({ limit, cursor });
  }
}
