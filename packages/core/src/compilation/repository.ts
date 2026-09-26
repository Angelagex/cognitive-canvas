import { CompilationEntity } from "./entity";

export class CompilationRepository {
  static async create(data: { id: string; name: string }) {
    return CompilationEntity.create(data).go();
  }

  static async get(id: string) {
    const result = await CompilationEntity.get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async update(id: string, data: Partial<{ name: string }>) {
    return CompilationEntity.update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return CompilationEntity.update({ id }).set({ deletedAt: Date.now() }).go();
  }

  static async list(limit = 10, cursor?: string) {
    return CompilationEntity.scan
      .where(({ deletedAt }, { notExists }) => notExists(deletedAt))
      .go({ limit, cursor });
  }
}
