import { AnkiFlashcard } from "@cognitive-canvas/core/types";

export interface AnkiConnectNote {
  deckName: string;
  modelName: "Basic" | "Cloze";
  fields: Record<string, string>;
  tags?: string[];
}

export class AnkiConnectClient {
  private baseUrl: string;

  constructor(hostIp: string = "192.168.1.100", port: number = 8765) {
    this.baseUrl = `http://${hostIp}:${port}`;
  }

  public setHostIp(hostIp: string, port: number = 8765) {
    this.baseUrl = `http://${hostIp}:${port}`;
  }

  private async request<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        version: 6,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`AnkiConnect HTTP Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`AnkiConnect Error: ${data.error}`);
    }

    return data.result;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const version = await this.request<number>("version");
      return version >= 6;
    } catch {
      return false;
    }
  }

  public async createDeck(deckName: string): Promise<number> {
    return this.request<number>("createDeck", { deck: deckName });
  }

  public async addNote(note: AnkiConnectNote): Promise<number> {
    return this.request<number>("addNote", {
      note: {
        deckName: note.deckName,
        modelName: note.modelName,
        fields: note.fields,
        tags: note.tags || ["cognitive-canvas", "grinde-pacer"],
        options: {
          allowDuplicate: false,
          duplicateScope: "deck",
        },
      },
    });
  }

  public async syncFlashcards(
    flashcards: AnkiFlashcard[],
    deckName: string = "CognitiveCanvas::MindMaps"
  ): Promise<{ synced: number; failed: number }> {
    await this.createDeck(deckName);

    let synced = 0;
    let failed = 0;

    for (const card of flashcards) {
      try {
        if (card.card_type === "CLOZE" && card.cloze_text) {
          await this.addNote({
            deckName,
            modelName: "Cloze",
            fields: {
              Text: card.cloze_text,
              Extra: `Target Node: ${card.target_node_id}`,
            },
          });
        } else if (card.front && card.back) {
          await this.addNote({
            deckName,
            modelName: "Basic",
            fields: {
              Front: card.front,
              Back: card.back,
            },
          });
        }
        synced++;
      } catch (err) {
        console.warn(`Failed to sync card ${card.target_node_id}:`, err);
        failed++;
      }
    }

    return { synced, failed };
  }
}

export const ankiClient = new AnkiConnectClient();
