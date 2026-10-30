/**
 * The site markers as HTML over the canvas (the CSS2D approach, without the
 * addon): each is a real button, so it is focusable, announced and clickable,
 * and it keeps the same pixel size at every zoom. Markers behind the limb are
 * hidden, which also takes them out of the tab order, and so are zone rings
 * that would cover another marker (marker-cull.ts). Sites that share a
 * point share one marker. The glass label of the selected site rides next to
 * its marker.
 */
import { isFacing, latLonToVector, type Vec3 } from './geo';
import { markerButton } from './marker-button';
import { cullZones } from './marker-cull';
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
    this.label.textContent = chosen?.site.name ?? '';
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
    const labelAt = shown.find(({ selected }) => selected)?.at;
    this.label.hidden = labelAt === undefined;
    if (labelAt) this.label.style.transform = `translate3d(${labelAt.x}px, ${labelAt.y}px, 0)`;
  }

  /** Takes the markers and the label off the page. */
  dispose(): void {
    this.root.remove();
  }
}
