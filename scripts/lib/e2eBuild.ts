/**
 * Whether a page was served by a build made for the e2e suite
 * (`NEXT_PUBLIC_E2E=1`): the root layout marks such a build with `data-e2e` on
 * `<html>`. Only that tag counts; a page that merely mentions the text (in its
 * body, or in the framework's data in a script) does not.
 */
export function isE2eBuild(html: string): boolean {
  return /<html[^>]*\sdata-e2e(?=[\s=/>])/.test(html)
}
