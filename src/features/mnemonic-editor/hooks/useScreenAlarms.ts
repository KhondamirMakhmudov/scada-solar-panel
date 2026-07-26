import { useMemo } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { deriveLiveStatus } from "../runtime/resolveVisual";

export type AlarmSeverity = "alarm" | "warning";

export interface ScreenAlarm {
  elementId: string;
  elementLabel: string;
  tagName: string;
  severity: AlarmSeverity;
  message: string;
}

export interface ScreenAlarmSummary {
  alarms: ScreenAlarm[];
  alarmCount: number;
  warningCount: number;
  /** Элементы с привязкой, находящиеся в штатном рабочем состоянии */
  okCount: number;
  /** Привязанные элементы, остановленные штатно (не авария) */
  stoppedCount: number;
  boundCount: number;
  /** Всего элементов на схеме, включая оформление без привязок */
  totalCount: number;
}

const EMPTY: ScreenAlarm[] = [];

/**
 * Сводка состояния схемы по живым значениям тегов — источник данных для
 * ленты состояния в шапке редактора.
 *
 * Семантика намеренно совпадает с индикаторами на самих фигурах
 * (resolveVisual.deriveLiveStatus), чтобы счётчик аварий в шапке и красные
 * точки на холсте никогда не расходились:
 *   • «Авария»   — тег отдаёт ошибку (fault);
 *   • «Внимание» — привязка есть, но значение ещё не получено (unknown);
 *   • «Норма» / «Останов» — рабочее и штатно остановленное состояние.
 *
 * Элементы без привязки в сводку не попадают: у оформительских фигур
 * (текст, подложка, здание) нет состояния, о котором можно сигнализировать.
 */
export function useScreenAlarms(): ScreenAlarmSummary {
  const elements = useDocumentStore((state) => state.document.elements);
  const values = useRuntimeStore((state) => state.values);
  const connectionStatus = useRuntimeStore((state) => state.connectionStatus);

  return useMemo(() => {
    const alarms: ScreenAlarm[] = [];
    let okCount = 0;
    let stoppedCount = 0;
    let boundCount = 0;

    for (const element of elements) {
      const bindings = [element.dataBinding, ...(element.extraBindings ?? [])].filter(
        (binding): binding is NonNullable<typeof binding> => Boolean(binding?.tagId),
      );
      if (bindings.length === 0) continue;
      boundCount += 1;

      const label = element.label?.trim() || element.type;

      // Ошибка на любом из тегов элемента — авария, даже если основной тег
      // читается нормально: оператор должен увидеть неисправный датчик.
      const errored = bindings.find((binding) => values[binding.tagId]?.isError);
      if (errored) {
        alarms.push({
          elementId: element.id,
          elementLabel: label,
          tagName: errored.tagName || errored.tagId,
          severity: "alarm",
          message: values[errored.tagId]?.errorMessage || "Ошибка чтения тега",
        });
        continue;
      }

      const status = deriveLiveStatus(
        element,
        element.dataBinding?.tagId ? values[element.dataBinding.tagId] : undefined,
        connectionStatus,
      );

      if (status === "fault") {
        alarms.push({
          elementId: element.id,
          elementLabel: label,
          tagName: element.dataBinding?.tagName || element.dataBinding?.tagId || "",
          severity: "alarm",
          message: "Аварийное состояние",
        });
      } else if (status === "unknown") {
        alarms.push({
          elementId: element.id,
          elementLabel: label,
          tagName: element.dataBinding?.tagName || element.dataBinding?.tagId || "",
          severity: "warning",
          message: "Нет данных по тегу",
        });
      } else if (status === "ok") {
        okCount += 1;
      } else if (status === "stopped") {
        stoppedCount += 1;
      }
    }

    // Аварии выше предупреждений — лента показывает только первые записи
    alarms.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "alarm" ? -1 : 1));

    return {
      alarms: alarms.length ? alarms : EMPTY,
      alarmCount: alarms.filter((a) => a.severity === "alarm").length,
      warningCount: alarms.filter((a) => a.severity === "warning").length,
      okCount,
      stoppedCount,
      boundCount,
      totalCount: elements.length,
    };
  }, [elements, values, connectionStatus]);
}
