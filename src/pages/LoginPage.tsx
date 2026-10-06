import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { authErrorMessage, useCloud } from '../hooks/useCloud';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/fields';
import { useToast } from '../components/ui/Toast';

/** Email + password sign-in (same approach as the other apps — works reliably in an iOS home-screen app). */
export function LoginPage() {
  const { signIn, resetPassword, continueLocally } = useCloud();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Введи email і пароль');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Введи email — надішлю на нього посилання для нового пароля');
      return;
    }
    try {
      await resetPassword(email);
      toast(`Лист для відновлення пароля надіслано на ${email.trim()}`, { duration: 6000 });
      setError('');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <main className="login" id="main">
      <form className="login__card card" onSubmit={submit} noValidate>
        <img className="login__logo" src={`${import.meta.env.BASE_URL}icons/app-192.png`} alt="" width={72} height={72} />
        <h1 className="login__title">Зарплата</h1>
        <p className="login__subtitle">Увійди, щоб розрахунки зберігались у хмарі й були на всіх пристроях</p>

        <div className="login__fields">
          <TextInput
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            enterKeyHint="next"
            value={email}
            onChange={setEmail}
            maxLength={120}
            icon={<Mail size={20} />}
          />
          <TextInput
            label="Пароль"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            onChange={setPassword}
            maxLength={120}
            icon={<Lock size={20} />}
            trailing={
              <button type="button" className="login__eye" aria-label={show ? 'Сховати пароль' : 'Показати пароль'} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
        </div>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={busy}>
          {busy ? 'Вхід…' : 'Увійти'}
        </Button>
        <button type="button" className="login__link" onClick={forgot}>
          Забули пароль?
        </button>
      </form>

      <button type="button" className="login__local" onClick={continueLocally}>
        Продовжити без входу
        <small>дані зберігатимуться лише на цьому пристрої</small>
      </button>
    </main>
  );
}
