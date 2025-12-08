// Abstractions for marketplace & AI adapters in public-core.

export interface MarketplaceAuth {
  // Конкретный проект может расширить это типом токенов/ключей.
  [key: string]: unknown;
}

export interface MarketplaceAdapter {
  readonly name: string;

  // Получить снапшот товара для последующей AI-обработки.
  fetchProductSnapshot(ref: { id: string; sku?: string | number }): Promise<unknown>;

  // Применить изменения к товару (rich-контент, имя и т.п.).
  applyProductChanges(
    ref: { id: string; sku?: string | number },
    changes: Record<string, unknown>
  ): Promise<unknown>;
}

export interface AiClient {
  readonly provider: string;

  generate(
    mode: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

