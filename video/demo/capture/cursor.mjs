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
 * A visible mouse pointer for the recording: headless Chromium draws none,
 * so this init script adds an arrow that follows the real mouse events and
 * dips when pressed. It lives only in the capture browser, never in the app.
 */
export function installCursor() {
  const arrow =
    '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 11.2-6.6.9 3.9 7.7-2.8 1.4-3.9-7.8L4 20z" ' +
    'fill="#f2f2f4" stroke="#07080b" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const mount = () => {
    const el = document.createElement('div');
    el.id = 'demo-cursor';
    el.innerHTML = arrow;
    Object.assign(el.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: 'translate(-100px, -100px)', transformOrigin: '4px 2px', willChange: 'transform',
      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
    });
    document.documentElement.appendChild(el);
    let x = -100;
    let y = -100;
    let scale = 1;
    const paint = () => { el.style.transform = `translate(${x - 4}px, ${y - 2}px) scale(${scale})`; };
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; paint(); }, true);
    window.addEventListener('pointerdown', () => { scale = 0.82; paint(); }, true);
    window.addEventListener('pointerup', () => { scale = 1; paint(); }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}
