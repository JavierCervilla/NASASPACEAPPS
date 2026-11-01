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
 * The DSN view's 24 h band (VENT-7, canvas «DsnC»): the UTC day of the
 * shared instant, a row per complex with where it sees the Moon above 10°
 * and, brighter, where it is the one listening; the playhead at the instant,
 * so scrubbing or playing moves it. Each row is named in words for a screen
 * reader. Neutral greys and white: never a signal colour.
 */
import { DSN_MIN_ELEVATION_DEG } from '@ventana/sim';
import { degText } from '../../dsn/clock-text';
import type { BandRow, DayPart } from '../../dsn/day-band';
import { dayBand } from '../../dsn/day-band';
import { STATIONS } from '../../dsn/stations';
import { useI18n } from '../i18n-context';
import { bandWords, type Words } from './band-words';
import type { Dsn } from './use-dsn';

const TICKS = [0, 6, 12, 18, 24];

/** A part's place on its track, through the CSSOM. */
const place = (part: DayPart) => ({
  left: `${part.from * 100}%`,
  width: `${(part.to - part.from) * 100}%`,
});

interface RowProps {
  readonly row: BandRow;
  readonly label: string;
}

function Row({ row, label }: RowProps) {
  return (
    <>
      <span className="dsn-band__name" data-now={row.now} aria-hidden="true">
        {STATIONS[row.complex].short}
      </span>
      <span className="dsn-band__track" role="img" aria-label={label}>
        {row.above.map((p) => (
          <span key={`a${p.from}`} className="dsn-band__above" style={place(p)} />
        ))}
        {row.active.map((p) => (
          <span key={`l${p.from}`} className="dsn-band__active" style={place(p)} />
        ))}
      </span>
    </>
  );
}

/** The day and the key: «Listening», «Moon above 10°». */
function Head({ day }: { readonly day: string }) {
  const i18n = useI18n();
  const deg = degText(i18n, DSN_MIN_ELEVATION_DEG);
  return (
    <div className="dsn-band__head">
      <span className="dsn-band__day">{day}</span>
      <span className="dsn-band__legend" aria-hidden="true">
        <span>
          <i className="dsn-band__key dsn-band__key--active" />
          {i18n.t('dsn.legendListening')}
        </span>
        <span>
          <i className="dsn-band__key" />
          {i18n.t('dsn.moonAbove', { deg })}
        </span>
      </span>
    </div>
  );
}

/** The playhead over the rows, and the hours under them. */
function Lane({ playhead, words }: { playhead: number; words: Words }) {
  return (
    <>
      <span className="dsn-band__lane" aria-hidden="true">
        <span className="dsn-band__playhead" style={{ left: `${playhead * 100}%` }}>
          <span className="dsn-band__chip">{words.chip}</span>
        </span>
      </span>
      <span className="dsn-band__hours" aria-hidden="true">
        {TICKS.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{words.tick(h)}</span>
        ))}
      </span>
    </>
  );
}

export function DsnBand({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const band = dayBand(dsn.spans, dsn.model.atMs);
  const words = bandWords(i18n, band, dsn.model.atMs);
  return (
    <div className="dsn-band" role="group" aria-label={words.label}>
      <Head day={words.day} />
      <div className="dsn-band__grid">
        {band.rows.map((row, i) => (
          <Row key={row.complex} row={row} label={words.rows[i] ?? ''} />
        ))}
        <Lane playhead={band.playhead} words={words} />
      </div>
    </div>
  );
}
