# Frontend Integration

Документация для фронта по текущему API и WebSocket-контракту сервиса.

## Base URL и префиксы

- Базовый API префикс: `/api`
- Версия API: `/v1`
- Итого полный префикс: `/api/v1`

Примеры:
- `GET /api/v1/health`
- `GET /api/v1/ready`
- `WS /api/v1/ws/devices/{device_id}`
- `WS /api/v1/ws/tags/{tag_id}`

## HTTP endpoints

### `GET /api/v1/health`

Liveness probe. Проверяет, что сервис поднят.

Response:

```json
{
  "status": "ok"
}
```

### `GET /api/v1/ready`

Readiness probe. Проверяет доступность БД.

Response:

```json
{
  "status": "ok",
  "database": "ok"
}
```

В случае проблем с БД:

```json
{
  "status": "degraded",
  "database": "error"
}
```

### `GET /api/v1/tag-values`

Сырая история значений тегов. Все параметры — query string, ответ — `{data, pagination}` (camelCase).

Query: `deviceId`, `tagId`, `tagIds` (список UUID через запятую, ≤100), `tagName`, `timeFrom`, `timeTo`, `isError`, `orderBy` (`time asc|desc`), `page`, `pageSize` (≤100).

### `GET /api/v1/tag-values/latest`

Последнее известное значение каждого тега — snapshot для мнемосхем до прихода WS-данных.

Query: `tagIds` и/или `deviceId` (минимум один). Ответ: `{"data": [TagValue]}` — по одной записи на тег.

### `GET /api/v1/tag-values/aggregates`

Downsampled история для трендов/графиков. Не тяните сырые точки для графика — используйте этот endpoint.

Query (все обязательные, кроме `fill`):

- `tagIds` — UUID через запятую, ≤100
- `timeFrom`, `timeTo` — ISO 8601, интервал `[timeFrom, timeTo)`
- `interval` — ширина бакета, ISO 8601 duration: `PT10S`, `PT1M`, `PT1H`, `P1D`
- `fill` — `none` (default) | `locf`: пустые бакеты заполняются последним наблюдением (`count: 0`)

Ограничение: `buckets × tags ≤ 50000` точек, иначе `400`. Значения с `isError=true` исключены.

Response:

```json
{
  "data": [
    {
      "tagId": "…",
      "tagName": "temperature",
      "buckets": [
        { "time": "2026-07-01T00:00:00Z", "avg": 1.2, "min": 0.9, "max": 1.5, "first": 1.0, "last": 1.4, "count": 12 }
      ]
    }
  ]
}
```

### `GET /api/v1/tag-values/statistics`

Сводка по тегам за период (для рапортов/панелей). Query: `tagIds`, `timeFrom`, `timeTo` — обязательные.

Response: `{"data": [{ "tagId", "tagName", "count", "min", "max", "avg", "firstValue", "lastValue", "firstTime", "lastTime" }]}`.

## WebSocket endpoints

Полная спецификация (жизненный цикл, deadband, порядок snapshot, ограничения): [WEBSOCKET_API.md](./WEBSOCKET_API.md).

### `WS /api/v1/ws/devices/{device_id}`

Подписка на события по устройству.

На подключении сервер отправляет историю (последние `10` записей), затем пушит новые записи в реальном времени.

### `WS /api/v1/ws/tags/{tag_id}`

Подписка на события по тегу.

На подключении сервер отправляет историю (последние `10` записей), затем пушит новые записи в реальном времени.

## Формат WS-сообщения

Одинаковый для обоих WS-каналов:

```json
{
  "tag_id": "5d71b2ea-c5f2-4da2-bf81-f06e809d9981",
  "device_id": "774b4d0d-e548-4629-bb9a-bf77c1b9b2d5",
  "tag_name": "temperature",
  "value": 23.7,
  "unit": "C",
  "is_error": false,
  "error_message": null,
  "time": "2026-04-20T16:23:44.838000+00:00",
  "ext": {
    "raw_value": 237
  }
}
```

Поля:
- `tag_id`: UUID тега
- `device_id`: UUID устройства
- `tag_name`: имя тега
- `value`: `number | null` (нормализованное числовое значение)
- `unit`: `string | null`
- `is_error`: `boolean`
- `error_message`: `string | null`
- `time`: ISO8601 timestamp
- `ext`: `object | null` (доп. данные, например `raw_value`)

## Поведение initial snapshot

При каждом новом WS-подключении сервер сначала отдает up to 10 последних значений:
- для `devices/{device_id}` — по устройству
- для `tags/{tag_id}` — по тегу

После этого идут live-сообщения.

Рекомендуемый клиентский алгоритм:
1. открыть сокет;
2. читать входящий поток как один и тот же контракт;
3. дедуплицировать по (`tag_id`, `time`) при необходимости;
4. ограничивать размер локального буфера (ring buffer).

## Важные нюансы

- Используй `ws://` или `wss://` (не `http://`).
- Не ставь двойной `/` в URL (например, `//api/v1/...`).
- Для работы WebSocket в рантайме нужен пакет `websockets` или `uvicorn[standard]`.
- Если приходят `404` и в логе `Unsupported upgrade request`, значит WS-библиотека не установлена или клиент бьет HTTP GET вместо WebSocket handshake.

## TypeScript тип для фронта

```ts
export type TagValueWsMessage = {
  tag_id: string;
  device_id: string;
  tag_name: string;
  value: number | null;
  unit: string | null;
  is_error: boolean;
  error_message: string | null;
  time: string; // ISO8601
  ext: Record<string, unknown> | null;
};
```

