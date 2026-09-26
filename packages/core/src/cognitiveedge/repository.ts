import { CognitiveEdgeEntity } from "./entity";

export class CognitiveEdgeRepository {
  static async create(data: { id: string; name: string }) {
    return CognitiveEdgeEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await CognitiveEdgeEntity.get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async update(id: string, data: Partial<{ name: string }>) {
    return CognitiveEdgeEntity.update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return CognitiveEdgeEntity.update({ id }).set({ deletedAt: Date.now() }).go();
  }

  static async list(limit = 10, cursor?: string) {
    return CognitiveEdgeEntity.scan
      .where(({ deletedAt }, { notExists }) => notExists(deletedAt))
      .go({ limit, cursor });
  }
}
