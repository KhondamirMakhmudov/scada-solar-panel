# WebSocket API

Спецификация потока значений тегов SCADA (Inventory Tag Service). HTTP-часть OpenAPI не описывает эти эндпоинты — используй этот документ.

## Базовый URL

Полный префикс HTTP API: `{origin}/api/v1` (например `http://localhost:8000/api/v1`).

WebSocket URL строится так же, с заменой схемы: `ws://` или `wss://`, без лишнего слэша перед `api`.

Пример: `ws://localhost:8000/api/v1/ws/devices/774b4d0d-e548-4629-bb9a-bf77c1b9b2d5`

## Эндпоинты

| Метод | Путь | Назначение |
|--------|------|------------|
| WebSocket | `/api/v1/ws/devices/{device_id}` | Подписка на все теги устройства |
| WebSocket | `/api/v1/ws/tags/{tag_id}` | Подписка на один тег |
| WebSocket | `/api/v1/ws/screens/{screen_id}` | Подписка на все теги экрана (один сокет на экран) |

Параметры пути — UUID в каноническом строковом виде (RFC 4122).

Аутентификация обязательна: query-параметр `token` с валидным JWT access-токеном (см. `_ws_authenticate` в `src/app/api/v1/ws.py`). Без токена или с невалидным — сокет закрывается кодом `4401`.

---

## Жизненный цикл

1. Клиент инициирует WebSocket upgrade на один из путей выше.
2. Сервер принимает соединение (`101 Switching Protocols`).
3. Сервер **сразу** читает из БД до **10** последних записей (`TagValue`) и для **каждой** отправляет отдельное JSON-сообщение (текстовый фрейм с `Content-Type` не применим — тело фрейма = JSON).
4. Порядок snapshot: записи отсортированы по `time` **по убыванию** (сначала более новые).
5. Далее соединение остаётся открытым; при появлении новых событий по этому устройству/тегу сервер пушит такие же JSON-объекты (см. источник ниже).
6. Клиент может слать **любые** текстовые фреймы; сервер вызывает `receive_text()` в цикле и **не интерпретирует** содержимое (удобно для ping/пустых keepalive от клиента библиотеки).
7. При обрыве клиента соединение закрывается, подписка снимается.

Ошибки на стороне сервера при обработке логируются; клиенту отдельное сообщение об ошибке не шлётся.

---

## Источник live-сообщений

После обработки события из Kafka (`tag_values`) сервер рассылает payload **всем** подписчикам:

- канал `devices/{device_id}` — если `device_id` совпадает;
- канал `tags/{tag_id}` — если `tag_id` совпадает;
- канал `screens/{screen_id}` — сокет подписан на все `tag_id` из `screen.tag_ids`, поэтому получает live-сообщение, если `tag_id` события входит в этот список. Неизвестный `screen_id` при подключении закрывает сокет кодом `4404`; пустой `tag_ids` — не ошибка, сокет просто ничего не получает.

Событие может быть **только broadcast** (не записано в БД из‑за deadband) — формат тела то же самое. Snapshot при открытии всегда из БД (до 10 строк).

---

## Формат сообщения (server → client)

Один JSON-объект на одно значение тега:

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
  "ext": { "raw_value": 237 }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `tag_id` | `string` (UUID) | Идентификатор тега |
| `device_id` | `string` (UUID) | Идентификатор устройства |
| `tag_name` | `string` | Имя тега |
| `value` | `number \| null` | Масштабированное значение |
| `unit` | `string \| null` | Единица |
| `is_error` | `boolean` | Флаг ошибки качества/диагностики |
| `error_message` | `string \| null` | Текст ошибки |
| `time` | `string` | Метка времени, ISO 8601 с offset (как в Python `datetime.isoformat()`) |
| `ext` | `object \| null` | Произвольный JSON; для live часто `{"raw_value": ...}` если raw отличается от scaled, иначе может быть `null` |

Поле `ext` в snapshot берётся из колонки БД как есть; в live — по логике обработчика событий (см. `tag_value_handler`).

---

## Клиент → сервер

Спецификации протокола приложения **нет**: достаточно периодически слать текст (например `ping` или пустую строку), чтобы удовлетворить ожидание сервера и keepalive прокси. Бинарные фреймы в текущей реализации не читаются.

---

## Ограничения и эксплуатация

- Нужен рантайм с поддержкой WebSocket (например `uvicorn[standard]` / `websockets`).
- `404` + в логах `Unsupported upgrade request` — часто библиотека WS не установлена или запрос идёт как обычный HTTP GET без `Upgrade: websocket`.
- Не дублируй `//` в URL после origin.

---

## Пример (браузер)

```js
const deviceId = "774b4d0d-e548-4629-bb9a-bf77c1b9b2d5";
const token = "<jwt-access-token>";
const proto = location.protocol === "https:" ? "wss:" : "ws:";
const url = `${proto}//${location.host}/api/v1/ws/devices/${deviceId}?token=${token}`;
const ws = new WebSocket(url);
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  console.log(msg.tag_name, msg.value, msg.time);
};
setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), 25000);
```

---

## TypeScript

```ts
export type TagValueWsMessage = {
  tag_id: string;
  device_id: string;
  tag_name: string;
  value: number | null;
  unit: string | null;
  is_error: boolean;
  error_message: string | null;
  time: string;
  ext: Record<string, unknown> | null;
};
```
