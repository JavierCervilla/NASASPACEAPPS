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
 * wears a ring (marker-ring.ts), hidden with its marker, that pulses when
 * the selection or its state changes, and both take the
 * colour of its state at the selected instant. Each kind of marker (exact
 * point, approximate zone) can be hidden as a whole, its globe layer
 * switched off (VENT-37, layers/site-layers.ts); the selected site's
 * marker always shows, so the ring never loses its marker.
 */
import { isFacing, latLonToVector, type Vec3 } from './geo';
import { markerButton } from './marker-button';
import { cullZones, inLayers, type Mark } from './marker-cull';
import { pickedSite, type PlacedMarker } from './marker-hit';
import {
  mergeColocated,
  type GlobeSite,
  type MarkerKind,
  type MarkerSite,
} from './markers';
import { MarkerRing } from './marker-ring';

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
  /**
   * The kinds whose markers show, from the next frame; the selected one
   * shows regardless (its layer's switch, layers/site-layers.ts).
   */
  readonly kinds = new Set<MarkerKind>(['exact', 'zone']);
  /** The markers shown at the last frame, where a click is routed. */
  private placed: PlacedMarker[] = [];
  /**
   * The layer; its `data-state` (globe.ts) is the selected site's state,
   * which its marker and ring wear (styles/globe.css).
   */
  readonly root = document.createElement('div');
  /**
   * The ring around the selected site's marker; globe.ts pulses it again
   * when it changes the state on {@link root}.
   */
  readonly ring: MarkerRing;

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
    this.root.dataset['state'] = 'unknown';
    this.root.addEventListener('click', (event) => {
      const id = pickedSite(event, this.root, this.placed);
      if (id) onPick(id);
    });
    this.ring = new MarkerRing(this.root);
    host.append(this.root);
  }

  /**
   * Replaces the markers with one per site, or per shared point, each
   * named by `nameOf` in the visitor's language.
   */
  setSites(
    sites: readonly GlobeSite[],
    nameOf: (site: GlobeSite) => string,
  ): void {
    for (const marker of this.markers) marker.el.remove();
    this.markers = mergeColocated(sites).map((site) => ({
      site,
      point: latLonToVector(site.lat, site.lonEast),
      el: markerButton(site, nameOf(site)),
    }));
    this.root.prepend(...this.markers.map((marker) => marker.el));
    this.select(this.selected);
  }

  /** Marks the site `id`'s marker as selected. */
  select(id: string | null): void {
    const chosen = this.markers.find(({ site }) =>
      site.members.some((member) => member.id === id),
    );
    const selected = chosen?.site.id ?? id;
    if (selected !== this.selected) this.ring.pulse();
    this.selected = selected;
    for (const { el, site } of this.markers) {
      el.setAttribute('aria-pressed', String(site === chosen?.site));
    }
    this.onChange();
  }

  /**
   * Moves every marker and the ring to where `project` puts them; says
   * where the markers that show are, for what must keep clear of them.
   */
  place(project: Projector, eye: Vec3): Mark[] {
    const facing = inLayers(this.markers, this.kinds, this.selected)
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
    this.ring.place(shown.find(({ selected }) => selected)?.at);
    return shown.map(({ at, selected }) => ({ at, selected }));
  }

  /** Takes the markers and the ring off the page. */
  dispose(): void {
    this.root.remove();
  }
}
