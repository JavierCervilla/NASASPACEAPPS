/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * The four widgets of the selected site (validated canvas «Phone · globe +
 * widgets»): right now (or at the chosen instant), sunset, earthset and
 * the listening DSN antenna (VENT-7: the simulator's, to the minute).
 * Skeletons while the API answers; an honest error when it does not, and
 * an honest state when the current hour is outside the data window.
 */
import type { ReactNode } from 'react';
import type { WidgetsResult } from '../../phone/widgets-loader';
import { DsnCard } from '../dsn/DsnCard';
import type { Dsn } from '../dsn/use-dsn';
import { useI18n } from '../i18n-context';

interface CardProps {
  readonly widget: {
    readonly label: ReactNode;
    readonly value: string;
    readonly detail: string;
  };
  /** Which signal colour the label takes; `muted` for none. */
  readonly tone: string;
  /** Large numbers (the countdowns) get the larger size. */
  readonly big?: boolean;
}

function Card({ widget, tone, big = false }: CardProps) {
  const { label, value, detail } = widget;
  return (
    <li className="widget">
      <span className="widget__label" data-tone={tone}>{label}</span>
      <span className={big ? 'widget__value widget__value--big' : 'widget__value'}>
        {value}
      </span>
      <span className="widget__detail">{detail}</span>
    </li>
  );
}

function Skeletons() {
  const { t } = useI18n();
  return (
    <ul className="widgets" aria-busy="true" aria-label={t('widgets.loading')}>
      {[0, 1, 2, 3].map((n) => (
        <li key={n} className="widget-skeleton" aria-hidden="true" />
      ))}
    </ul>
  );
}

function Failure({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="widgets-error" role="alert">
      <p>{t('data.siteError')}</p>
      <button type="button" onClick={onRetry}>{t('data.retry')}</button>
    </div>
  );
}

/** The current hour has no data: said plainly, never clamped data. */
function Outside() {
  const { t } = useI18n();
  return (
    <p className="widgets-outside" role="status">
      {t('data.outside')}
    </p>
  );
}

interface Props {
  readonly result: WidgetsResult;
  readonly onRetry: () => void;
  /** The chosen instant, «Mon 23 Nov · 18:00 UTC»; null: live, now. */
  readonly when: string | null;
  /** The DSN at the instant; null until it is known. */
  readonly dsn: Dsn | null;
}

export function Widgets({ result, onRetry, when, dsn }: Props) {
  const { t } = useI18n();
  if (result.kind === 'loading') return <Skeletons />;
  if (result.kind === 'error') return <Failure onRetry={onRetry} />;
  if (result.kind === 'outside') return <Outside />;
  const { now, sun, earth } = result.widgets;
  const label = (
    <>
      <span className="signal-dot" data-state={now.state} />
      {when ?? t('widgets.rightNow')}
    </>
  );
  const name = when ? t('widgets.at', { when }) : t('widgets.now');
  return (
    <ul className="widgets" aria-label={name}>
      <Card widget={{ ...now, label, value: now.title }} tone={now.state} />
      <Card widget={sun} tone="sun" big />
      <Card widget={earth} tone="earth" big />
      {dsn ? <DsnCard dsn={dsn} /> : <li className="widget-skeleton" aria-hidden="true" />}
    </ul>
  );
}
