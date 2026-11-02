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
 * The server's stop on SIGTERM (VENT-43): the terrain fetch is aborted
 * (its `.part` stays for the next run and its lock is released as the
 * fetch unwinds), the server stops taking connections, and the process
 * exits once the fetch has let go, or after `graceMs` at most, well
 * inside Docker's 10 s before SIGKILL.
 */

export interface GracefulStop {
  readonly abort: AbortController;
  readonly closeServer: () => void;
  /** Settles when the fetch has stopped and released its lock. */
  readonly pending: Promise<unknown>;
  readonly graceMs: number;
  readonly exit: (code: number) => void;
}

/** Stops the fetch and the server, then exits with 0. */
export async function stopGracefully(stop: GracefulStop): Promise<void> {
  stop.abort.abort();
  stop.closeServer();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const grace = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, stop.graceMs);
  });
  const settled = stop.pending.then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([settled, grace]);
  clearTimeout(timer);
  stop.exit(0);
}
