# P2 — Reader Experience

P2 improves the chapter-reading flow without changing the platform's free-access policy.

## Included

- **Resume where you stopped:** the reader stores the scroll position per book and chapter in the current browser and restores it when that chapter is opened again.
- **Low-overhead position saving:** scroll position writes are debounced so scrolling does not trigger a local-storage write on every event.
- **Reading context:** each chapter shows its estimated reading time, current scroll percentage, and approximate remaining minutes.
- **Existing controls retained:** light/dark/sepia themes, adjustable font size and line spacing, font family choices, chapter navigation, bookmarks, copy-code actions, and distraction-free mode remain available.

## Storage and privacy

Scroll position is stored in browser local storage on the current device. It is not uploaded to the account or synced across devices. Clearing browser site data removes the saved position. Existing chapter-level progress and bookmarks continue to use the current progress service.

## Manual smoke test

1. Open a published book and scroll to the middle of a chapter.
2. Refresh the page; confirm the reader returns close to the saved position.
3. Navigate to another chapter and back; confirm each chapter retains its own position.
4. Confirm a URL hash/section anchor still takes precedence over saved scroll position.
5. Check reading time and progress labels on desktop and mobile widths.
6. Change theme, font size, line spacing, and font family; confirm controls still work.
7. Verify the progress bar updates while scrolling and that the chapter navigation and discussions remain usable.

## Known limitations

- Exact scroll position is device/browser-local, not cross-device.
- Remaining-time calculation is an estimate based on the chapter's configured reading time and the current scroll percentage; long code blocks and different reading speeds can affect accuracy.
