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
 * The on-foot view's report steps in the dev tools' breadcrumbs (VENT-49): while the tools are on, each step the crash
 * report keeps is also marked in the trail that survives a GPU crash. The report stays the source.
 */
import { describe, expect, it } from 'vitest';
import type { Environment } from '../src/terrain/report/environment';
import { createRecorder } from '../src/terrain/report/recorder';
import { crumbsOf } from '../src/terrain/report/report-crumbs';

const ENV: Environment = {
  tier: 'high', leftOut: '', page: '/#horizon', userAgent: 'test', gpu: null, pixelRatio: 1, viewport: '800x600',
  threads: null, deviceMemoryGb: null, battery: null,
};

function recorder() {
  return createRecorder({
    storage: () => null,
    now: () => 0,
    date: () => new Date('2026-11-02T23:00:00.000Z'),
    environment: (mount) => ({ ...ENV, ...mount }),
    battery: () => undefined,
  });
}

function trail() {
  const marks: string[] = [];
  return { marks, mark: (step: string) => void marks.push(step) };
}

describe('the on-foot steps in the breadcrumbs', () => {
  it('marks the steps the run had before the tools came, then each new one', () => {
    const report = recorder();
    const crumbs = trail();
    report.begin({ tier: 'high', leftOut: '' });
    report.step('scene mounted at tier high');
    report.tap(crumbsOf(crumbs));
    report.step('stage created');
    expect(crumbs.marks).toEqual([
      'on-foot: mount at tier high', 'on-foot: scene mounted at tier high', 'on-foot: stage created',
    ]);
  });

  it('marks a run of repeated steps once, as the report folds it', () => {
    const report = recorder();
    const crumbs = trail();
    report.begin({ tier: 'low', leftOut: 'shade' });
    report.tap(crumbsOf(crumbs));
    for (let i = 0; i < 5; i++) report.step('turn', 'turn');
    report.step('coast starting');
    report.step('turn', 'turn');
    expect(crumbs.marks).toEqual([
      'on-foot: mount at tier low, left out: shade', 'on-foot: turn', 'on-foot: coast starting', 'on-foot: turn',
    ]);
  });

  it('marks a folded step it never saw, once, when it joins late', () => {
    const report = recorder();
    const crumbs = trail();
    report.begin({ tier: 'high', leftOut: '' });
    report.step('turn', 'turn');
    report.step('turn', 'turn');
    report.tap(crumbsOf(crumbs));
    report.step('turn', 'turn');
    expect(crumbs.marks).toEqual(['on-foot: mount at tier high', 'on-foot: turn']);
  });

  it('hears a new run\'s mount, and nothing once untapped', () => {
    const report = recorder();
    const crumbs = trail();
    report.begin({ tier: 'high', leftOut: '' });
    const untap = report.tap(crumbsOf(crumbs));
    report.begin({ tier: 'low', leftOut: '' });
    untap();
    report.step('stage created');
    expect(crumbs.marks).toEqual(['on-foot: mount at tier high', 'on-foot: mount at tier low']);
  });

  it('leaves the report as it was', () => {
    const plain = recorder();
    const tapped = recorder();
    tapped.tap(crumbsOf(trail()));
    for (const report of [plain, tapped]) {
      report.begin({ tier: 'medium', leftOut: '' });
      report.step('stage created');
      report.step('turn', 'turn');
      report.step('turn', 'turn');
    }
    expect(tapped.text()).toBe(plain.text());
  });
});
