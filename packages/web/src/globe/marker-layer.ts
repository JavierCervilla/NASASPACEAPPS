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
 * The site markers as HTML over the canvas (the CSS2D approach, without the
 * addon): each is a real button, so it is focusable, announced and clickable,
 * and it keeps the same pixel size at every zoom. Markers behind the limb are
 * hidden, which also takes them out of the tab order, and so are zone rings
 * that would cover another marker (marker-cull.ts). Where two boxes
 * overlap, a click goes to the dot nearest the pointer (marker-hit.ts).
 * Sites that share a point share one marker. The glass label of the
 * selected site rides next to its marker.
 */
import { isFacing, latLonToVector, type Vec3 } from './geo';
import { markerButton } from './marker-button';
import { cullZones } from './marker-cull';
import { pickedSite, type PlacedMarker } from './marker-hit';
import { mergeColocated, type GlobeSite, type MarkerSite } from './markers';
import { SiteLabel } from './site-label';

/** Screen position, in px from the host's top left, of a globe point. */
export type Projector = (point: Vec3) => { x: number; y: number };

interface Marker {
  readonly site: MarkerSite;
  readonly point: Vec3;
  readonly el: HTMLButtonElement;
}

export class MarkerLayer {
  private markers: Marker[] = [];
  private selected: string | null;
  /** The markers shown at the last frame, where a click is routed. */
  private placed: PlacedMarker[] = [];
  private readonly root = document.createElement('div');
  /** The selected site's label; the page clips it above the sheet. */
  readonly label = new SiteLabel();

  /**
   * `onPick` hears a tapped marker's site; the selection comes back
   * through {@link select}, so the globe and the site list agree.
   */
  constructor(
    host: HTMLElement,
    selected: string | null,
    private readonly onChange: () => void,
    onPick: (id: string) => void,
  ) {
    this.selected = selected;
    this.root.className = 'globe-markers';
    this.root.addEventListener('click', (event) => {
      const id = pickedSite(event, this.root, this.placed);
      if (id) onPick(id);
    });
    this.root.append(this.label.el);
    host.append(this.root);
  }

  /** Replaces the markers with one per site, or per shared point. */
  setSites(sites: readonly GlobeSite[]): void {
    for (const marker of this.markers) marker.el.remove();
    this.markers = mergeColocated(sites).map((site) => ({
      site,
      point: latLonToVector(site.lat, site.lonEast),
      el: markerButton(site),
    }));
    this.root.prepend(...this.markers.map((marker) => marker.el));
    this.select(this.selected);
  }

  /** Marks the site `id`'s marker as selected and names it in the label. */
  select(id: string | null): void {
    const chosen = this.markers.find(({ site }) =>
      site.members.some((member) => member.id === id),
    );
    this.selected = chosen?.site.id ?? id;
    for (const { el, site } of this.markers) {
      el.setAttribute('aria-pressed', String(site === chosen?.site));
    }
    this.label.name(chosen?.site.name ?? '');
    this.onChange();
  }

  /** Moves every marker and the label to where `project` puts them. */
  place(project: Projector, eye: Vec3): void {
    const facing = this.markers
      .filter(({ point }) => isFacing(point, eye))
      .map((marker) => ({
        marker,
        at: project(marker.point),
        zone: marker.site.approximate,
        selected: marker.site.id === this.selected,
      }));
    const shown = cullZones(facing);
    const visible = new Set(shown.map(({ marker }) => marker));
    for (const marker of this.markers) {
      const hide = !visible.has(marker);
      if (marker.el.hidden !== hide) marker.el.hidden = hide;
    }
    for (const { marker, at } of shown) {
      marker.el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
    }
    this.placed = shown.map(({ marker, at }) => ({ id: marker.site.id, at }));
    const labelAt = shown.find(({ selected }) => selected)?.at ?? null;
    this.label.follow(labelAt, this.root.clientWidth);
  }

  /** Takes the markers and the label off the page. */
  dispose(): void {
    this.root.remove();
  }
}
