/**
 * The site markers as HTML over the canvas (the CSS2D approach, without the
 * addon): each is a real button, so it is focusable, announced and clickable,
 * and it keeps the same pixel size at every zoom. Markers behind the limb are
 * hidden, which also takes them out of the tab order. The glass label of the
 * selected site rides next to its marker.
 */
import { isFacing, latLonToVector, type Vec3 } from './geo';
import { markerButton } from './marker-button';
import type { GlobeSite } from './markers';

/** Screen position, in px from the host's top left, of a globe point. */
export type Projector = (point: Vec3) => { x: number; y: number };

interface Marker {
  readonly site: GlobeSite;
  readonly point: Vec3;
  readonly el: HTMLButtonElement;
}

export class MarkerLayer {
  private markers: Marker[] = [];
  private selected: string | null;
  private readonly root = document.createElement('div');
  private readonly label = document.createElement('div');

  constructor(
    host: HTMLElement,
    selected: string | null,
    private readonly onChange: () => void,
  ) {
    this.selected = selected;
    this.root.className = 'globe-markers';
    this.label.className = 'globe-label';
    this.label.hidden = true;
    this.root.addEventListener('click', (event) => {
      const id = (event.target as HTMLElement).dataset['siteId'];
      if (id) this.select(id);
    });
    this.root.append(this.label);
    host.append(this.root);
  }

  /** Replaces the markers with one per site. */
  setSites(sites: readonly GlobeSite[]): void {
    for (const marker of this.markers) marker.el.remove();
    this.markers = sites.map((site) => ({
      site,
      point: latLonToVector(site.lat, site.lonEast),
      el: markerButton(site),
    }));
    this.root.prepend(...this.markers.map((marker) => marker.el));
    this.select(this.selected);
  }

  /** Marks the site `id` as selected and names it in the label. */
  select(id: string | null): void {
    this.selected = id;
    const chosen = this.markers.find((m) => m.site.id === id);
    for (const { el, site } of this.markers) {
      el.setAttribute('aria-pressed', String(site === chosen?.site));
    }
    this.label.textContent = chosen?.site.name ?? '';
    this.onChange();
  }

  /** Moves every marker and the label to where `project` puts them. */
  place(project: Projector, eye: Vec3): void {
    let labelAt: { x: number; y: number } | null = null;
    for (const { site, point, el } of this.markers) {
      const facing = isFacing(point, eye);
      if (el.hidden === facing) el.hidden = !facing;
      if (!facing) continue;
      const { x, y } = project(point);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (site.id === this.selected) labelAt = { x, y };
    }
    this.label.hidden = labelAt === null;
    if (labelAt) {
      this.label.style.transform = `translate3d(${labelAt.x}px, ${labelAt.y}px, 0)`;
    }
  }

  /** Takes the markers and the label off the page. */
  dispose(): void {
    this.root.remove();
  }
}
