/**
 * The four widgets of the selected site (validated canvas «Phone · globe +
 * widgets»): right now, sunset, earthset and the listening DSN antenna.
 * Skeletons while the API answers; an honest error when it does not.
 */
import type { ReactNode } from 'react';
import type { WidgetsResult } from '../../phone/widgets-loader';

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
  return (
    <ul className="widgets" aria-busy="true" aria-label="Loading this site">
      {[0, 1, 2, 3].map((n) => (
        <li key={n} className="widget-skeleton" aria-hidden="true" />
      ))}
    </ul>
  );
}

function Failure({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="widgets-error" role="alert">
      <p>The Sun and Earth data for this site could not load.</p>
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}

interface Props {
  readonly result: WidgetsResult;
  readonly onRetry: () => void;
}

export function Widgets({ result, onRetry }: Props) {
  if (result.kind === 'loading') return <Skeletons />;
  if (result.kind === 'error') return <Failure onRetry={onRetry} />;
  const { now, sun, earth, dsn } = result.widgets;
  const label = (
    <>
      <span className="signal-dot" data-state={now.state} />
      Right now
    </>
  );
  const listening = { ...dsn, label: 'Listening on Earth' };
  return (
    <ul className="widgets" aria-label="This site now">
      <Card widget={{ ...now, label, value: now.title }} tone={now.state} />
      <Card widget={sun} tone="sun" big />
      <Card widget={earth} tone="earth" big />
      <Card widget={listening} tone="muted" />
    </ul>
  );
}
