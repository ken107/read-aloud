# Firefox MV2 reader mode

Load the Firefox branch as a temporary extension, then choose Reader mode in
Options → Show highlighting.

- On an ordinary article, click the toolbar button. Check title/byline, text,
  current-sentence highlighting, and playback status.
- Pause/resume from both the overlay and toolbar. Seek by clicking a sentence;
  check forward/rewind, Stop, minimize/expand, Escape, and display settings.
- Switch to another article and start there. The old overlay must not show the
  new article's text. A failed start on a restricted page must preserve the
  previous playback and provide fallback controls with the error.
- Click Play repeatedly during startup; only one reader and one playback should
  start. Stop during source/voice preparation, then immediately start again;
  the canceled request must not restart speech or stop the new request.
- On a source whose top frame cannot accept the overlay (such as a PDF viewer),
  check that a separate control window opens. Reopening fallback controls must
  not restart paused/stopped audio or create duplicate windows.
- Verify existing Firefox permission/error links in fallback controls. A denied
  request must not automatically retry when that window opens.
- Change Show highlighting back to Popup/Separate window and check the original
  toolbar behavior. Test selected-text reading and keyboard shortcuts as well.
- Check reader fonts online, then with the font host unavailable: cached fonts
  or system fallback fonts should keep the reader usable without new permissions.

Automated coverage: tests/reader-mv2.test.js and tests/popup-startup.test.js.
The headless visual smoke test uses mocked playback; it does not verify audio.
