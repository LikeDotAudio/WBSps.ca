# YOU_TUBE: the "Unmistakably Ward-Beck" series

An episode per folder: `Episode N - Title/episode.py` (the script and its pictures), the edit decision list (`edl.json`,
`episode.edl`), your edits (`edits.json`), the voice-over text (`vo/`) and the shot list. The series' style guide is
`style.json`. Pictures are named by their paths in the archive, `WBSps.ca/2026/`. Video, audio and pictures stay offline.

The editor and the build are their own repository, `youtube-editor`, beside this folder:

    python3 ../youtube-editor/editor.py                       # the editor, in the browser
    python3 ../youtube-editor/build_series.py --episode 3.1   # build one episode (--no-video: plan only)
