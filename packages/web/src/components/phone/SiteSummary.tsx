/** The sheet at peek and half: the site's name, coordinates and widgets. */
import { formatCoords } from '../../phone/format';
import { splitName, type PhoneSite } from '../../phone/phone-site';
import type { WidgetsResult } from '../../phone/widgets-loader';
import { Widgets } from './Widgets';

interface Props {
  readonly site: PhoneSite;
  readonly result: WidgetsResult;
  readonly onRetry: () => void;
}

export function SiteSummary({ site, result, onRetry }: Props) {
  return (
    <div className="summary">
      <div className="summary__head">
        <h2 className="summary__name">{splitName(site.name).title}</h2>
        <span className="summary__coords">
          {formatCoords(site.lat, site.lonEast)}
        </span>
      </div>
      <Widgets result={result} onRetry={onRetry} />
    </div>
  );
}
