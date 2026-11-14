/**
 * The parts every panel over the planet shares (a place's, `PanelShell`, and
 * the profile's, `ProfilePanel`), so the two read as one design.
 */

/** The panel's scrolling body, under its header. */
export const PANEL_BODY = 'min-h-0 flex-1 overflow-auto overscroll-contain px-[22px] pb-[22px] pt-5'

/** The ✕ at the end of the panel's header. */
export const PANEL_CLOSE = 'p-1 text-[15px] leading-none text-ink no-underline'

/** The panel's heading, the page's h1: the place's name, or the profile section's title. */
export const PANEL_TITLE = 'mb-[9px] font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.015em]'

/** The id of a profile section's heading (its page's h1), which names the profile's panel. */
export const PROFILE_TITLE_ID = 'profile-title'
