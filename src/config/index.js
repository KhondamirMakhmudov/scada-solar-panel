export const config = {
  JAVA_API_URL: "http://10.20.6.129:18080/",
  PYTHON_API_URL: "http://10.20.6.23:8100/api/v1/",
  SCADA_TEST_URL: "http://10.20.6.23:8101/api/v1/",
  SCREENS_API_URL: "http://10.20.6.23:8102/api/v1/",
  WEBSOCKET_URL: "ws://10.20.6.23:8102/",
  // Дубликат сервиса экранов (8102) для черновых записей — не влияет на прод.
  SCREENS_API_DRAFT_URL: "http://10.20.6.23:8103/api/v1/",
  GENERAL_AUTH_URL: "https://app.tpp.uz",
};
