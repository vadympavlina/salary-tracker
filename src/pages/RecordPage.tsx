import { useState } from 'react';
import { CircleCheck, PencilLine, SearchX, Share2, Trash2 } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { useRouter } from '../router/router';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { formatDateTime, formatPeriod, shiftPeriod } from '../utils/period';
import { formatNumber, formatUAH } from '../utils/format';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MoneySummary } from '../components/salary/MoneySummary';
import { CalculationBreakdown } from '../components/salary/CalculationBreakdown';
import { STATUS_LABEL } from '../components/salary/PaymentStatus';
import { useToast } from '../components/ui/Toast';

export function RecordPage({ id }: { id: string }) {
  const { getRecord, findByPeriod, deleteRecord, restoreRecord, setDraft } = useSalary();
  const { navigate, state } = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const record = getRecord(id);
  const justSaved = (state as { saved?: boolean } | undefined)?.saved;

  if (!record) {
    return (
      <>
        <PageHeader title="Деталі розрахунку" backTo="/history" />
        <EmptyState icon={<SearchX size={30} />} title="Запис не знайдено" text="Можливо, його було видалено." action={<Button to="/history">До історії</Button>} />
      </>
    );
  }

  const calc = calculateSalary(record);
  const prev = findByPeriod(shiftPeriod(record.period, -1));
  const change = percentChange(calc.grossIncome, prev ? calculateSalary(prev).grossIncome : undefined);
  const title = formatPeriod(record.period);

  const edit = () => {
    setDraft(null);
    navigate(`/calculate?edit=${record.id}`);
  };

  const remove = async () => {
    setConfirm(false);
    const removed = await deleteRecord(record.id);
    navigate('/history', { replace: true });
    if (removed) {
      toast(`${title} видалено`, { tone: 'info', action: { label: 'Скасувати', onClick: () => restoreRecord(removed) } });
    }
  };

  const share = async () => {
    const text = [
      `Зарплата — ${title}`,
      `Пари: ${formatNumber(record.pairs)} × ${formatUAH(record.pairRate)} = ${formatUAH(calc.pairIncome)}`,
      `Відео: ${formatNumber(record.videos)} × ${formatUAH(record.videoRate)} = ${formatUAH(calc.videoIncome)}`,
      `Аванс: ${formatUAH(calc.advance)} · Додаткові: ${formatUAH(calc.additional)}`,
      `Всього нараховано: ${formatUAH(calc.grossIncome)}`,
      `На картку: ${formatUAH(calc.received)} · На руки: ${formatUAH(calc.netIncome)}`,
      `Отримано на руки: ${formatUAH(calc.cashReceived)} · Залишилось: ${formatUAH(calc.remaining)}`,
      `Статус: ${STATUS_LABEL[calc.status]}`,
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: `Зарплата — ${title}`, text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Скопійовано в буфер обміну');
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') toast('Не вдалося поділитися', { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title="Деталі розрахунку"
        subtitle={title}
        backTo="/history"
        actions={
          <IconButton label="Поділитися або скопіювати" onClick={share}>
            <Share2 size={19} />
          </IconButton>
        }
      />
      {justSaved && (
        <p className="notice notice--success success-pop" role="status">
          <CircleCheck size={22} aria-hidden="true" />
          <span>
            <b>Розрахунок успішно збережено</b>
            <small>Дані додано до історії та аналітики</small>
          </span>
        </p>
      )}
      <div className="detail-layout">
        <div className="stack">
          <SalaryCard record={record} calc={calc} change={change} />
          <MoneySummary calc={calc} />
          <p className="meta">
            Створено {formatDateTime(record.createdAt)}
            {record.updatedAt !== record.createdAt && <> · змінено {formatDateTime(record.updatedAt)}</>}
            {record.isDemo && <> · демо-запис</>}
          </p>
        </div>
        <div className="card">
          <CalculationBreakdown input={record} calc={calc} />
        </div>
      </div>
      <div className="action-bar action-bar--sticky">
        <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setConfirm(true)}>
          Видалити
        </Button>
        <Button icon={<PencilLine size={18} />} onClick={edit} className="grow">
          Редагувати
        </Button>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Видалити розрахунок?"
        description={`Запис за ${title.toLowerCase()} буде видалено з історії та аналітики.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Скасувати
            </Button>
            <Button variant="danger" className="grow" icon={<Trash2 size={18} />} onClick={remove}>
              Видалити
            </Button>
          </>
        }
      />
    </>
  );
}
