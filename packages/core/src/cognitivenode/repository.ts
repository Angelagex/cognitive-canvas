import { CognitiveNodeEntity } from "./entity";

export class CognitiveNodeRepository {
  static async create(data: { id: string; name: string }) {
    return CognitiveNodeEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await CognitiveNodeEntity.get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async update(id: string, data: Partial<{ name: string }>) {
    return CognitiveNodeEntity.update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return CognitiveNodeEntity.update({ id }).set({ deletedAt: Date.now() }).go();
  }

  static async list(limit = 10, cursor?: string) {
    return CognitiveNodeEntity.scan
      .where(({ deletedAt }, { notExists }) => notExists(deletedAt))
      .go({ limit, cursor });
  }
}
