/** The phone sheet's four widgets, as text ready to show. */

/** What a lander has right now: the four signal states. */
export type NowState = 'window' | 'sun' | 'earth' | 'none';

export interface NowWidget {
  readonly state: NowState;
  /** «Landing window», «Sun only», «Earth only» or «No window». */
  readonly title: string;
  /** «47 % of November»: the month's share of window hours. */
  readonly detail: string;
}

/** The Sun or the Earth: when it sets (or rises) and where it is now. */
export interface BodyWidget {
  /** «Sunset in», «Sunrise in», «Earthset in» or «Earthrise in». */
  readonly label: string;
  /** «7 d 1 h», or «at least 7 d» when it outlasts the range. */
  readonly value: string;
  /** «Sun 6.4° up». */
  readonly detail: string;
}

/** The Deep Space Network complex listening to the Moon. */
export interface DsnWidget {
  /** «Robledo», or «No antenna». */
  readonly value: string;
  /** «Madrid · ~12 h left», or when the next one picks up. */
  readonly detail: string;
}

export interface SiteWidgets {
  readonly now: NowWidget;
  readonly sun: BodyWidget;
  readonly earth: BodyWidget;
  readonly dsn: DsnWidget;
}
