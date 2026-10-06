import { useRef, useState, type ReactNode } from 'react';
import { Banknote, ChevronRight, CreditCard, Download, HandCoins, Moon, Smartphone, Sun, SunMoon, Trash2, Upload, Wallet, Scale } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { isIOS, isStandalone, useInstallPrompt } from '../hooks/useInstallPrompt';
import { ImportError, parseImport, type AppData } from '../services/storage/salaryStorage';
import type { AdvanceMode, ThemePreference } from '../types/salary';
import { formatUAH, plural } from '../utils/format';
import { fromNumber, toNumber } from '../utils/input';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CurrencyInput, TextInput } from '../components/ui/fields';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';

interface RowProps {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function Row({ icon, label, value, onClick, danger }: RowProps) {
  return (
    <li>
      <button type="button" className={`row${danger ? ' row--danger' : ''}`} onClick={onClick}>
        <span className="row__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="row__label">{label}</span>
        {value !== undefined && <span className="row__value num">{value}</span>}
        <ChevronRight className="row__chevron" size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

type Editor = null | 'profile' | 'pairRate' | 'videoRate' | 'defaultAdvance' | 'defaultCard' | 'advanceMode' | 'theme' | 'clearAll' | 'install';

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Світла', dark: 'Темна', system: 'Як у системі' };
const THEME_ICON: Record<ThemePreference, ReactNode> = { light: <Sun size={19} />, dark: <Moon size={19} />, system: <SunMoon size={19} /> };

const RATE_META = {
  pairRate: { title: 'Ставка за пару', label: 'Ставка за пару', icon: <Banknote size={20} /> },
  videoRate: { title: 'Ставка за відео', label: 'Ставка за відео', icon: <Wallet size={20} /> },
  defaultAdvance: { title: 'Аванс за замовчуванням', label: 'Сума авансу', icon: <HandCoins size={20} /> },
  defaultCard: { title: 'Сума на картку', label: 'Щомісяця приходить на картку', icon: <CreditCard size={20} /> },
} as const;

export function SettingsPage() {
  const store = useSalary();
  const { settings, profile, records } = store;
  const toast = useToast();
  const install = useInstallPrompt();
  const [editor, setEditor] = useState<Editor>(null);
  const [value, setValue] = useState('');
  const [text, setText] = useState({ firstName: '', fullName: '' });
  const [mode, setMode] = useState<AdvanceMode>(settings.advanceMode);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = profile.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const open = (e: Exclude<Editor, null>) => {
    if (e === 'pairRate' || e === 'videoRate' || e === 'defaultAdvance' || e === 'defaultCard') setValue(fromNumber(settings[e]));
    if (e === 'profile') setText({ ...profile });
    if (e === 'advanceMode') setMode(settings.advanceMode);
    setEditor(e);
  };
  const close = () => setEditor(null);

  const saveNumber = async () => {
    if (editor === 'pairRate' || editor === 'videoRate' || editor === 'defaultAdvance' || editor === 'defaultCard') {
      await store.updateSettings({ [editor]: toNumber(value) });
      toast('Збережено. Нові розрахунки використають це значення.');
    }
    close();
  };

  const exportData = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Експортовано ${records.length} ${plural(records.length, ['запис', 'записи', 'записів'])}`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new ImportError('Файл завеликий.');
      setPendingImport(parseImport(await file.text()));
    } catch (e) {
      toast(e instanceof ImportError ? e.message : 'Не вдалося прочитати файл.', { tone: 'error' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doImport = async (m: 'replace' | 'merge') => {
    if (!pendingImport) return;
    const n = await store.importData(pendingImport, m);
    setPendingImport(null);
    toast(`Імпортовано ${n} ${plural(n, ['запис', 'записи', 'записів'])}`);
  };

  const installApp = async () => {
    if (install.canPrompt) {
      if (await install.prompt()) toast('Застосунок встановлено');
    } else open('install');
  };

  const isRateEditor = editor === 'pairRate' || editor === 'videoRate' || editor === 'defaultAdvance' || editor === 'defaultCard';

  return (
    <>
      <PageHeader title="Налаштування" />
      <div className="settings">
        <button type="button" className="profile-card card" onClick={() => open('profile')}>
          <span className="avatar">{initials}</span>
          <span className="profile-card__text">
            <b>{profile.fullName}</b>
            <small>Особистий профіль · привітання «{profile.firstName}»</small>
          </span>
          <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
        </button>

        <section className="settings__section">
          <h2 className="settings__title">Параметри розрахунку</h2>
          <ul className="list-card">
            <Row icon={<Banknote size={19} />} label="Ставка за пару" value={formatUAH(settings.pairRate)} onClick={() => open('pairRate')} />
            <Row icon={<Wallet size={19} />} label="Ставка за відео" value={formatUAH(settings.videoRate)} onClick={() => open('videoRate')} />
            <Row icon={<CreditCard size={19} />} label="Сума на картку" value={settings.defaultCard ? formatUAH(settings.defaultCard) : 'Немає'} onClick={() => open('defaultCard')} />
            <Row icon={<HandCoins size={19} />} label="Типовий аванс" value={settings.defaultAdvance ? formatUAH(settings.defaultAdvance) : 'Немає'} onClick={() => open('defaultAdvance')} />
            <Row icon={<Scale size={19} />} label="Режим авансу" value={settings.advanceMode === 'part' ? 'Частина ЗП' : 'Додатковий'} onClick={() => open('advanceMode')} />
          </ul>
          <p className="settings__note">Ставки й сума на картку автоматично підставляються в кожен новий місяць — для конкретного місяця їх можна змінити. Збережені розрахунки не змінюються.</p>
        </section>

        <section className="settings__section">
          <h2 className="settings__title">Вигляд</h2>
          <ul className="list-card">
            <Row icon={THEME_ICON[settings.theme]} label="Тема" value={THEME_LABEL[settings.theme]} onClick={() => open('theme')} />
          </ul>
        </section>

        <section className="settings__section">
          <h2 className="settings__title">Дані</h2>
          <ul className="list-card">
            <Row icon={<Download size={19} />} label="Експорт даних" value="JSON" onClick={exportData} />
            <Row icon={<Upload size={19} />} label="Імпорт даних" onClick={() => fileRef.current?.click()} />
            <Row icon={<Trash2 size={19} />} label="Видалити всі дані" onClick={() => open('clearAll')} danger />
          </ul>
          <p className="settings__note">Дані зберігаються лише на цьому пристрої. Роби експорт, щоб мати резервну копію або перенести дані.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </section>

        {!isStandalone() && (
          <section className="settings__section">
            <h2 className="settings__title">Застосунок</h2>
            <ul className="list-card">
              <Row icon={<Smartphone size={19} />} label="Додати на головний екран" onClick={installApp} />
            </ul>
          </section>
        )}

        <p className="settings__footer">Зарплата · версія {__APP_VERSION__}</p>
      </div>

      {/* Profile */}
      <Modal
        open={editor === 'profile'}
        onClose={close}
        title="Профіль"
        footer={
          <Button
            block
            onClick={async () => {
              await store.updateProfile(text);
              toast('Профіль оновлено');
              close();
            }}
          >
            Зберегти
          </Button>
        }
      >
        <TextInput label="Ім’я для привітання" value={text.firstName} onChange={(v) => setText((t) => ({ ...t, firstName: v }))} autoComplete="given-name" maxLength={30} />
        <TextInput label="Повне ім’я" value={text.fullName} onChange={(v) => setText((t) => ({ ...t, fullName: v }))} autoComplete="name" />
      </Modal>

      {/* Rates / default advance */}
      <Modal
        open={isRateEditor}
        onClose={close}
        title={isRateEditor ? RATE_META[editor].title : ''}
        footer={
          <Button block onClick={saveNumber}>
            Зберегти
          </Button>
        }
      >
        {isRateEditor && <CurrencyInput label={RATE_META[editor].label} value={value} onChange={setValue} icon={RATE_META[editor].icon} max={10_000_000} />}
      </Modal>

      {/* Theme — applied instantly so the choice can be previewed */}
      <Modal open={editor === 'theme'} onClose={close} title="Тема" footer={<Button block onClick={close}>Готово</Button>}>
        <Segmented
          label="Тема оформлення"
          value={settings.theme}
          onChange={(theme) => store.updateSettings({ theme })}
          options={[
            { value: 'light', label: 'Світла' },
            { value: 'dark', label: 'Темна' },
            { value: 'system', label: 'Системна' },
          ]}
        />
        <p className="explain">«Системна» перемикається разом із темою телефона чи комп’ютера.</p>
      </Modal>

      {/* Advance mode */}
      <Modal
        open={editor === 'advanceMode'}
        onClose={close}
        title="Як враховувати аванс"
        footer={
          <Button
            block
            onClick={async () => {
              await store.updateSettings({ advanceMode: mode });
              toast('Збережено для нових розрахунків');
              close();
            }}
          >
            Зберегти
          </Button>
        }
      >
        <Segmented
          label="Режим авансу"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'part', label: 'Частина ЗП' },
            { value: 'extra', label: 'Додатковий дохід' },
          ]}
        />
        <div className="explain">
          {mode === 'part' ? (
            <>
              <p>Аванс — це частина зарплати, яку ти вже отримав.</p>
              <p className="explain__formula">
                Нараховано = пари + відео + додаткові
                <br />
                На руки = нараховано − аванс − картка
              </p>
            </>
          ) : (
            <>
              <p>Аванс — окрема виплата понад зарплату за пари й відео.</p>
              <p className="explain__formula">
                Нараховано = пари + відео + додаткові + аванс
                <br />
                На руки = нараховано − аванс − картка
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Import */}
      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Імпорт даних"
        description={
          pendingImport
            ? `У файлі ${pendingImport.records.length} ${plural(pendingImport.records.length, ['розрахунок', 'розрахунки', 'розрахунків'])}. «Замінити» видалить поточні дані й відновить усе з файлу (разом зі ставками). «Об’єднати» додасть місяці з файлу до наявних.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => doImport('merge')}>
              Об’єднати
            </Button>
            <Button className="grow" onClick={() => doImport('replace')}>
              Замінити
            </Button>
          </>
        }
      />

      {/* Clear all */}
      <Modal
        open={editor === 'clearAll'}
        onClose={close}
        title="Видалити всі дані?"
        description="Усі розрахунки, ставки та профіль буде видалено з цього пристрою. Дію не можна скасувати — спершу зроби експорт."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Скасувати
            </Button>
            <Button
              variant="danger"
              className="grow"
              icon={<Trash2 size={18} />}
              onClick={async () => {
                await store.clearAll();
                toast('Усі дані видалено', { tone: 'info' });
                close();
              }}
            >
              Видалити все
            </Button>
          </>
        }
      />

      {/* Install instructions */}
      <Modal
        open={editor === 'install'}
        onClose={close}
        title="Додати на головний екран"
        footer={
          <Button block onClick={close}>
            Зрозуміло
          </Button>
        }
      >
        <ol className="steps">
          {isIOS() ? (
            <>
              <li>Відкрий сайт у Safari.</li>
              <li>Натисни «Поділитися» внизу екрана.</li>
              <li>Обери «На початковий екран» і підтверди.</li>
            </>
          ) : (
            <>
              <li>Відкрий меню браузера (⋮).</li>
              <li>Обери «Встановити застосунок» або «Додати на головний екран».</li>
              <li>Підтверди встановлення.</li>
            </>
          )}
        </ol>
      </Modal>
    </>
  );
}
