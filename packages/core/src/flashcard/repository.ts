import { FlashcardEntity } from "./entity";

export type CreateFlashcardInput = {
  id: string;
  canvasId: string;
  compilationId: string;
  targetNodeId: string;
  cardType: "BASIC" | "CLOZE";
  front?: string;
  back?: string;
  clozeText?: string;
  deckName?: string;
  syncedToAnki?: boolean;
};

export type UpdateFlashcardInput = Partial<Omit<CreateFlashcardInput, "id">>;

export class FlashcardRepository {
  static async create(data: CreateFlashcardInput) {
    return FlashcardEntity.create(data).go();
  }

  static async batchCreate(cards: CreateFlashcardInput[]) {
    return FlashcardEntity.put(cards).go();
  }

  static async get(id: string) {
    const result = await (FlashcardEntity as any).get({ id }).go();
    if (!result.data || result.data.deletedAt) return null;
    return result.data;
  }

  static async listByCompilation(compilationId: string) {
    const result = await (FlashcardEntity as any).query.byCompilation({ compilationId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async listByCanvas(canvasId: string) {
    const result = await (FlashcardEntity as any).query.byCanvas({ canvasId }).go();
    return result.data.filter((item: any) => !item.deletedAt);
  }

  static async update(id: string, data: UpdateFlashcardInput) {
    return (FlashcardEntity as any).update({ id }).set(data).go();
  }

  static async delete(id: string) {
    return (FlashcardEntity as any).update({ id }).set({ deletedAt: Date.now() }).go();
  }
}
