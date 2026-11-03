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
 * The host's `data-ready` mark (VENT-34): set once the scene's parts are
 * in (the ground's maps), so the tests know the scene is complete. A scene
 * that is freed before they arrive must not mark whatever scene the host
 * holds next, and a new scene starts clear.
 */

/**
 * Clears the mark, then sets it and calls `onReady` when `standing`
 * settles, unless the returned cancel ran first.
 */
export function markReadyWhenStanding(
  host: { readonly dataset: DOMStringMap },
  standing: Promise<void>,
  onReady: () => void,
): () => void {
  delete host.dataset['ready'];
  let live = true;
  void standing.then(() => {
    if (!live) return;
    host.dataset['ready'] = 'true';
    onReady();
  });
  return () => {
    live = false;
  };
}
