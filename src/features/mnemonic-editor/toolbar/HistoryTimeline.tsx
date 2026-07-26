import { useHistoryStore } from "../store/history/historyStore";

/** Сколько делений показывать — дальше лента становится нечитаемой полосой из волосяных штрихов. */
const MAX_TICKS = 14;

/**
 * Визуальная лента правок: слева от курсора — выполненные шаги, справа —
 * отменённые (доступные для повтора). Клик по делению откатывает или
 * повторяет сразу несколько шагов, что быстрее серии Ctrl+Z при
 * компоновке сложной схемы.
 *
 * Прыжок реализован повторными вызовами undo/redo, а не переходом по индексу:
 * история хранит команды с инверсиями (historyStore), и применять их можно
 * только последовательно.
 */
const HistoryTimeline = () => {
  const past = useHistoryStore((state) => state.past);
  const future = useHistoryStore((state) => state.future);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);

  const total = past.length + future.length;
  if (total === 0) {
    return (
      <div
        className="flex items-center gap-px h-6 px-1.5 rounded-md border border-slate-800/70"
        title="История правок пуста"
      >
        <span className="text-[10px] text-slate-700">нет правок</span>
      </div>
    );
  }

  // При переполнении показываем хвост истории: недавние шаги важнее самых
  // первых, а курсор должен остаться видимым
  const skipped = Math.max(0, total - MAX_TICKS);
  const ticks = Array.from({ length: total - skipped }, (_, i) => i + skipped);

  const jumpTo = (targetPastLength: number) => {
    const delta = targetPastLength - past.length;
    for (let i = 0; i < Math.abs(delta); i += 1) {
      if (delta < 0) undo();
      else redo();
    }
  };

  return (
    <div
      className="flex items-center gap-px h-6 px-1.5 rounded-md border border-slate-800/70"
      title={`Правок: ${past.length} выполнено, ${future.length} отменено`}
    >
      {skipped > 0 && <span className="text-[9px] text-slate-700 mr-0.5">+{skipped}</span>}
      {ticks.map((index) => {
        const isApplied = index < past.length;
        return (
          <button
            key={index}
            type="button"
            // index — позиция шага; чтобы шаг стал последним применённым,
            // длина past должна стать index + 1
            onClick={() => jumpTo(index + 1)}
            title={isApplied ? `Откатить до шага ${index + 1}` : `Повторить до шага ${index + 1}`}
            className={`w-1 h-3 rounded-sm transition-colors hover:h-4 ${
              isApplied ? "bg-blue-500/70 hover:bg-blue-400" : "bg-slate-700 hover:bg-slate-500"
            }`}
          />
        );
      })}
    </div>
  );
};

export default HistoryTimeline;
