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

/** The per-address cap on computations in flight (VENT-46). */
import { describe, expect, it } from 'vitest';
import { IpSlots, SlotLimitError } from '../src/ip-slots.ts';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('IpSlots', () => {
  it('hands out as many slots as it may run at once, apart for each key', async () => {
    const slots = new IpSlots({ running: 2, waiting: 0 });
    const a = [await slots.acquire('a'), await slots.acquire('a')];
    await expect(slots.acquire('a')).rejects.toThrow(SlotLimitError);
    const b = await slots.acquire('b');
    [...a, b].forEach((release) => release());
  });

  it('makes the next caller wait, in order, and refuses past the waiting room', async () => {
    const slots = new IpSlots({ running: 1, waiting: 2 });
    const order: string[] = [];
    const first = await slots.acquire('a');
    const second = slots.acquire('a').then((r) => (order.push('second'), r));
    const third = slots.acquire('a').then((r) => (order.push('third'), r));
    await expect(slots.acquire('a')).rejects.toThrow(SlotLimitError);
    await tick();
    expect(order).toEqual([]);
    first();
    const secondRelease = await second;
    expect(order).toEqual(['second']);
    secondRelease();
    (await third)();
    expect(order).toEqual(['second', 'third']);
  });

  it('keeps the slot held while a waiter takes it over, so the cap never overshoots', async () => {
    const slots = new IpSlots({ running: 1, waiting: 1 });
    const first = await slots.acquire('a');
    const waiter = slots.acquire('a');
    first();
    // The slot went to the waiter: a newcomer queues behind it, it does not run.
    const newcomer = slots.acquire('a');
    (await waiter)();
    (await newcomer)();
    expect(slots.size()).toBe(0);
  });

  it('lets a release run once only', async () => {
    const slots = new IpSlots({ running: 1, waiting: 0 });
    const release = await slots.acquire('a');
    release();
    release();
    const again = await slots.acquire('a');
    await expect(slots.acquire('a')).rejects.toThrow(SlotLimitError);
    again();
  });

  it('forgets a key when its last slot is released, so the map stays small', async () => {
    const slots = new IpSlots({ running: 2, waiting: 1 });
    const held = await Promise.all(
      Array.from({ length: 500 }, (_, i) => slots.acquire(`10.0.${Math.floor(i / 256)}.${i % 256}`)),
    );
    expect(slots.size()).toBe(500);
    held.forEach((release) => release());
    expect(slots.size()).toBe(0);
  });

  it('says when to come back: a second, a refusal is quick to retry', () => {
    expect(new SlotLimitError().retryAfterSec).toBe(1);
  });
});
