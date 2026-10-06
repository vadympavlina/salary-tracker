import { useEffect, useState } from 'react';
import { Check, PencilLine } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { useRouter } from '../router/router';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { formatPeriod, shiftPeriod } from '../utils/period';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MoneySummary } from '../components/salary/MoneySummary';
import { CalculationBreakdown } from '../components/salary/CalculationBreakdown';
import { useToast } from '../components/ui/Toast';

export function ResultPage() {
  const { draft, saveRecord, setDraft, findByPeriod } = useSalary();
  const { navigate, back } = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Direct visit / refresh without a calculation in progress → back to the form.
  useEffect(() => {
    if (!draft) navigate('/calculate', { replace: true });
  }, [draft, navigate]);
  if (!draft) return null;

  const { input, editId } = draft;
  const calc = calculateSalary(input);
  const prev = findByPeriod(shiftPeriod(input.period, -1));
  const change = percentChange(calc.netIncome, prev ? calculateSalary(prev).netIncome : undefined);
  const backTo = editId ? `/calculate?edit=${editId}` : '/calculate';

  const save = async () => {
    setSaving(true);
    try {
      const record = await saveRecord(input, editId);
      setDraft(null);
      toast(editId ? 'Зміни збережено' : 'Розрахунок збережено');
      navigate(`/history/${record.id}`, { replace: true, state: { saved: true } });
    } catch {
      toast('Не вдалося зберегти. Перевір вільне місце у браузері.', { tone: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Результат" subtitle={formatPeriod(input.period)} backTo={backTo} />
      <div className="detail-layout">
        <div className="stack">
          <SalaryCard record={input} calc={calc} change={change} />
          <MoneySummary calc={calc} />
        </div>
        <div className="card">
          <CalculationBreakdown input={input} calc={calc} />
        </div>
      </div>
      <div className="action-bar action-bar--sticky">
        <Button variant="secondary" icon={<PencilLine size={18} />} onClick={() => back(backTo)}>
          Змінити
        </Button>
        <Button icon={<Check size={20} strokeWidth={2.6} />} onClick={save} disabled={saving} className="grow">
          {saving ? 'Збереження…' : 'Зберегти'}
        </Button>
      </div>
    </>
  );
}
