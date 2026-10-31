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
 * Sites that share a point share one marker. The selected site's marker
 * wears a pulsing ring, hidden with its marker, and both take the
 * colour of its state at the selected instant.
 */
import { isFacing, latLonToVector, type Vec3 } from './geo';
import { markerButton } from './marker-button';
import { cullZones } from './marker-cull';
import { pickedSite, type PlacedMarker } from './marker-hit';
import { mergeColocated, type GlobeSite, type MarkerSite } from './markers';

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
  /**
   * The layer; its `data-state` (globe.ts) is the selected site's state,
   * which its marker and ring wear (styles/globe.css).
   */
  readonly root = document.createElement('div');
  /** The pulsing ring around the selected site's marker. */
  private readonly ring = document.createElement('span');

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
    this.ring.className = 'globe-ring';
    this.ring.setAttribute('aria-hidden', 'true');
    this.ring.hidden = true;
    this.root.className = 'globe-markers';
    this.root.dataset['state'] = 'unknown';
    this.root.addEventListener('click', (event) => {
      const id = pickedSite(event, this.root, this.placed);
      if (id) onPick(id);
    });
    this.root.append(this.ring);
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

  /** Marks the site `id`'s marker as selected. */
  select(id: string | null): void {
    const chosen = this.markers.find(({ site }) =>
      site.members.some((member) => member.id === id),
    );
    this.selected = chosen?.site.id ?? id;
    for (const { el, site } of this.markers) {
      el.setAttribute('aria-pressed', String(site === chosen?.site));
    }
    this.onChange();
  }

  /** Moves every marker and the ring to where `project` puts them. */
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
    // The ring hides with the selected marker (behind the limb).
    const ringAt = shown.find(({ selected }) => selected)?.at;
    if (this.ring.hidden !== !ringAt) this.ring.hidden = !ringAt;
    if (ringAt) {
      this.ring.style.transform = `translate3d(${ringAt.x}px, ${ringAt.y}px, 0)`;
    }
  }

  /** Takes the markers and the ring off the page. */
  dispose(): void {
    this.root.remove();
  }
}
