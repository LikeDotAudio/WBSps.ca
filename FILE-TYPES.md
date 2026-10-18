# File types and how to open them

Every file can be opened in the browser with `viewer.html?f=<path>` (links in the wiki, index and search do this). Formats a browser cannot show get a converted copy in `_previews/` (built by `timelines/make_previews.py`). The originals are never changed.

| Type | Files | What it is | Desktop application | Browser preview |
|---|---|---|---|---|
| `.md` | 13,191 | Markdown note / wiki page | Obsidian; VS Code; any text editor | shown as text |
| `.jpg` | 11,743 | photo / scan | any browser; Image Viewer; GIMP | native |
| `.dxf` | 3,879 | AutoCAD DXF drawing (footprints, panels) | LibreOffice Draw; Inkscape; KiCad (import) | SVG via ezdxf |
| `.html` | 1,233 | — | — | none |
| `.pdf` | 629 | PDF document | any browser; Document Viewer | native |
| `.png` | 496 | image | any browser; Image Viewer; GIMP | native |
| `.svg` | 374 | vector drawing (renders, previews) | any browser; Inkscape | native |
| `.docx` | 209 | Word document (modern manuals) | LibreOffice Writer | PDF via LibreOffice |
| `.dwg` | 115 | AutoCAD DWG drawing (R11/R12 mechanical) | needs a DWG viewer — ODA File Converter or DraftSight (not installed) | none yet |
| `.kicad_sym` | 110 | — | — | none |
| `.yaml` | 109 | — | — | none |
| `.jpeg` | 91 | photo / scan | any browser; Image Viewer; GIMP | native |
| `.psd` | 75 | Photoshop image | GIMP | PNG via ImageMagick |
| `.kicad_pro` | 63 | — | — | none |
| `.kicad_pcb` | 63 | KiCad board | KiCad | SVG renders in Engineering/PCB/ |
| `.kicad_prl` | 63 | — | — | none |
| `.sch` | 51 | OrCAD SDT schematic (DOS) | OrCAD SDT (not installed) | none yet |
| `.wp` | 39 | WordPerfect 5 document (original manuals) | LibreOffice Writer (rename to .wpd if it refuses) | PDF via LibreOffice |
| `.plt` | 38 | — | — | none |
| `.gif` | 36 | image | any browser; Image Viewer | native |
| `.tif` | 26 | TIFF scan | GIMP; Image Viewer | PNG via ImageMagick |
| `.dsn` | 24 | OrCAD Capture schematic (binary) | OrCAD Capture (not installed) | recovered text |
| `.wpd` | 24 | WordPerfect document (original manuals) | LibreOffice Writer | PDF via LibreOffice |
| `.pcb` | 21 | Tango-PCB PLUS board layout (1980s DOS) | browser viewer here; KiCad after conversion (Engineering/PCB/) | interactive PCB viewer |
| `.cdr` | 16 | CorelDRAW artwork (labels, front panels) | LibreOffice Draw; Inkscape | PDF via LibreOffice |
| `.bom` | 13 | — | — | none |
| `.net` | 11 | — | — | none |
| `.txt` | 9 | text | any browser; Text Editor | native |
| `.lib` | 8 | — | — | none |
| `.xlsx` | 7 | Excel spreadsheet | LibreOffice Calc | PDF via LibreOffice |
| `.py` | 7 | — | — | none |
| `.eps` | 4 | EPS artwork / logo | Inkscape; GIMP | PNG via ImageMagick |
| `.smk` | 3 | — | — | none |
| `.rep` | 2 | — | — | none |
| `.bot` | 2 | — | — | none |
| `.slk` | 2 | — | — | none |
| `.top` | 2 | — | — | none |
| `.drl` | 2 | — | — | none |
| `.pyc` | 2 | — | — | none |
| `.doc` | 1 | Word 97 document | LibreOffice Writer | PDF via LibreOffice |
| `.brd` | 1 | Eagle board layout | KiCad (File → Import → Eagle); browser viewer here | interactive PCB viewer |
| `.exl` | 1 | — | — | none |
| `.ncd` | 1 | — | — | none |
| `.apt` | 1 | — | — | none |
| `.sta` | 1 | — | — | none |
| `.scr` | 1 | — | — | none |
| `.me` | 1 | — | — | none |
| `.tap` | 1 | — | — | none |
| `.cmk` | 1 | — | — | none |
| `.sld` | 1 | — | — | none |
| `.gap` | 1 | — | — | none |
| `.cmp` | 1 | — | — | none |
| `.usr` | 1 | — | — | none |
| `.js` | 1 | — | — | none |
| `.db` | 1 | — | — | none |

## Not viewable yet

- **DWG** (AutoCAD R11/R12, 108 files): needs the ODA File Converter or LibreDWG to turn them into DXF, after which the DXF path above applies.
- **OrCAD .DSN / .SCH**: only text is recovered; drawings need OrCAD.
