import { FlashcardEntity } from "./entity";

export class FlashcardRepository {
  static async create(data: { id: string; name: string }) {
    return FlashcardEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await FlashcardEntity.get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async update(id: string, data: Partial<{ name: string }>) {
    return FlashcardEntity.update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return FlashcardEntity.update({ id }).set({ deletedAt: Date.now() }).go();
  }

  static async list(limit = 10, cursor?: string) {
    return FlashcardEntity.scan
      .where(({ deletedAt }, { notExists }) => notExists(deletedAt))
      .go({ limit, cursor });
  }
}
