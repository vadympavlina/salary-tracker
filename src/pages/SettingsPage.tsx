import { useRef, useState, type ReactNode } from 'react';
import { Banknote, ChevronRight, Cloud, CloudOff, CreditCard, LogOut, Download, HandCoins, Moon, Smartphone, Sun, SunMoon, Trash2, Upload, Wallet, Scale } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { useCloud, type SyncStatus } from '../hooks/useCloud';
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
import { Group, Tile, type TileColor } from '../components/ui/List';

interface RowProps {
  icon: ReactNode;
  color: TileColor;
  label: string;
  value?: ReactNode;
  /** Second line under the label (e.g. sync status). */
  sub?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function Row({ icon, color, label, value, sub, onClick, danger }: RowProps) {
  return (
    <li>
      <button type="button" className={`row row--action${danger ? ' row--danger' : ''}`} onClick={onClick}>
        <Tile color={color}>{icon}</Tile>
        <span className="row__label">
          <span className="row__title">{label}</span>
          {sub && <small className="row__sub">{sub}</small>}
        </span>
        {value !== undefined && <span className="row__value num">{value}</span>}
        <ChevronRight className="row__chevron" size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </li>
  );
}

type Editor = null | 'account' | 'signOut' | 'profile' | 'pairRate' | 'videoRate' | 'defaultAdvance' | 'defaultCard' | 'advanceMode' | 'theme' | 'clearAll' | 'install';

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: 'Підключення…',
  syncing: 'Синхронізація…',
  synced: 'Синхронізовано',
  offline: 'Офлайн — синхронізую пізніше',
  error: 'Помилка синхронізації',
};

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Світла', dark: 'Темна', system: 'Як у системі' };
const THEME_ICON: Record<ThemePreference, ReactNode> = { light: <Sun size={17} strokeWidth={2.3} />, dark: <Moon size={17} strokeWidth={2.3} />, system: <SunMoon size={17} strokeWidth={2.3} /> };

const RATE_META = {
  pairRate: { title: 'Ставка за пару', label: 'Ставка за пару', icon: <Banknote size={20} /> },
  videoRate: { title: 'Ставка за відео', label: 'Ставка за відео', icon: <Wallet size={20} /> },
  defaultAdvance: { title: 'Аванс за замовчуванням', label: 'Сума авансу', icon: <HandCoins size={20} /> },
  defaultCard: { title: 'Сума на картку', label: 'Щомісяця приходить на картку', icon: <CreditCard size={20} /> },
} as const;

export function SettingsPage() {
  const store = useSalary();
  const { settings, profile, records } = store;
  const cloud = useCloud();
  const signedIn = !cloud.localOnly && !!cloud.user;
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
      <PageHeader title="Налаштування" backTo="/" />
      <div className="settings">
        <button type="button" className="profile-card card" onClick={() => open('profile')}>
          <span className="avatar">{initials}</span>
          <span className="profile-card__text">
            <b>{profile.fullName}</b>
            <small>Привітання: «{profile.firstName}»</small>
          </span>
          <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
        </button>

        <Group title="Параметри розрахунку" list footer="Ставки й сума на картку підставляються в кожен новий місяць — для конкретного місяця їх можна змінити. Збережені розрахунки не змінюються.">
            <Row color="violet" icon={<Banknote size={17} strokeWidth={2.3} />} label="Ставка за пару" value={formatUAH(settings.pairRate)} onClick={() => open('pairRate')} />
            <Row color="blue" icon={<Wallet size={17} strokeWidth={2.3} />} label="Ставка за відео" value={formatUAH(settings.videoRate)} onClick={() => open('videoRate')} />
            <Row color="teal" icon={<CreditCard size={17} strokeWidth={2.3} />} label="Сума на картку" value={settings.defaultCard ? formatUAH(settings.defaultCard) : 'Немає'} onClick={() => open('defaultCard')} />
            <Row color="green" icon={<HandCoins size={17} strokeWidth={2.3} />} label="Типовий аванс" value={settings.defaultAdvance ? formatUAH(settings.defaultAdvance) : 'Немає'} onClick={() => open('defaultAdvance')} />
            <Row color="orange" icon={<Scale size={17} strokeWidth={2.3} />} label="Режим авансу" value={settings.advanceMode === 'part' ? 'Частина ЗП' : 'Додатковий'} onClick={() => open('advanceMode')} />
          </Group>


        <Group title="Вигляд" list>
            <Row color="violet" icon={THEME_ICON[settings.theme]} label="Тема" value={THEME_LABEL[settings.theme]} onClick={() => open('theme')} />
          </Group>


        <Group title="Синхронізація" list footer={signedIn
              ? 'Дані зберігаються в хмарі Firebase й на цьому пристрої — працює й без інтернету, синхронізується, щойно з’явиться мережа.'
              : 'Зараз дані лише на цьому пристрої. Увійди, щоб вони зберігались у хмарі й були на всіх пристроях.'}>
            {signedIn ? (
              <>
                <Row color="blue" icon={<Cloud size={17} strokeWidth={2.3} />} label={cloud.user!.email ?? 'Акаунт'} sub={SYNC_LABEL[cloud.status]} onClick={() => open('account')} />
                <Row color="grey" icon={<LogOut size={17} strokeWidth={2.3} />} label="Вийти" onClick={() => open('signOut')} />
              </>
            ) : (
              <Row color="grey" icon={<CloudOff size={17} strokeWidth={2.3} />} label="Увійти для синхронізації" onClick={cloud.requestSignIn} />
            )}
          </Group>


        <Group title="Дані" list footer={signedIn ? 'Експорт — додаткова резервна копія у файл (JSON).' : 'Дані зберігаються лише на цьому пристрої. Роби експорт, щоб мати резервну копію або перенести дані.'}>
            <Row color="blue" icon={<Download size={17} strokeWidth={2.3} />} label="Експорт даних" value="JSON" onClick={exportData} />
            <Row color="green" icon={<Upload size={17} strokeWidth={2.3} />} label="Імпорт даних" onClick={() => fileRef.current?.click()} />
            <Row color="red" icon={<Trash2 size={17} strokeWidth={2.3} />} label="Видалити всі дані" onClick={() => open('clearAll')} danger />
          </Group>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />


        {!isStandalone() && (
          <Group title="Застосунок" list>
              <Row color="violet" icon={<Smartphone size={17} strokeWidth={2.3} />} label="Додати на головний екран" onClick={installApp} />
            </Group>

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
        description={
          signedIn
            ? 'Усі розрахунки, ставки та профіль буде видалено з хмари й з усіх пристроїв. Дію не можна скасувати — спершу зроби експорт.'
            : 'Усі розрахунки, ставки та профіль буде видалено з цього пристрою. Дію не можна скасувати — спершу зроби експорт.'
        }
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

      {/* Account / sync status */}
      <Modal open={editor === 'account'} onClose={close} title="Синхронізація" footer={<Button block onClick={close}>Готово</Button>}>
        <dl className="account">
          <div>
            <dt>Акаунт</dt>
            <dd>{cloud.user?.email}</dd>
          </div>
          <div>
            <dt>Стан</dt>
            <dd>{SYNC_LABEL[cloud.status]}</dd>
          </div>
          <div>
            <dt>Розрахунків</dt>
            <dd className="num">{records.length}</dd>
          </div>
        </dl>
      </Modal>

      {/* Sign out */}
      <Modal
        open={editor === 'signOut'}
        onClose={close}
        title="Вийти з акаунта?"
        description={
          cloud.status === 'synced'
            ? 'Усі дані збережені в хмарі. З цього пристрою їх буде прибрано — після входу вони повернуться.'
            : 'Схоже, не всі зміни ще встигли синхронізуватися. Підключись до інтернету й зачекай кілька секунд — інакше останні зміни з цього пристрою можуть загубитися.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Скасувати
            </Button>
            <Button
              variant="danger"
              className="grow"
              icon={<LogOut size={18} />}
              onClick={async () => {
                close();
                await cloud.signOut();
                await store.wipeLocal();
              }}
            >
              Вийти
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
